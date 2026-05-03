import { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Line,
  Circle,
  Group,
  Rect as KRect,
  Ellipse,
  Arrow,
} from "react-konva";
import type Konva from "konva";
import {
  closestPointOnEllipse,
  closestPointOnPolyline,
  closestPointOnRect,
  distance,
  polygonArea,
  polylineLength,
  rectFromPoints,
  snapToAngle,
  squareFromPoints,
  type Point,
  type Rect as GeomRect,
} from "./geometry";
import { baseToDisplay, displayToBase, type Rotation } from "./rotation";
import {
  DEFAULT_FILL_OPACITY,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_TEXT_FONT_SIZE,
  useAppStore,
  type LineStyle,
  type Measurement,
} from "../state/store";
import { formatArea, formatLength, type UnitSystem } from "../lib/units";
import { AnnotationLabel } from "./AnnotationLabel";

type Props = {
  pageWidth: number;
  pageHeight: number;
  rotation: Rotation;
  fitScale: number;
  zoom: number;
  pan: { x: number; y: number };
  containerWidth: number;
  containerHeight: number;
  onCalibrationDrawn: (pdfLength: number) => void;
};

const POINT_RADIUS = 5;
const POINT_RADIUS_SELECTED = 6;

export const MeasureStage = ({
  pageWidth,
  pageHeight,
  rotation,
  fitScale,
  zoom,
  pan,
  containerWidth,
  containerHeight,
  onCalibrationDrawn,
}: Props) => {
  const tool = useAppStore((s) => s.tool);
  const units = useAppStore((s) => s.units);
  const showLabels = useAppStore((s) => s.showLabels);
  const measurements = useAppStore((s) => s.measurements);
  const selectedId = useAppStore((s) => s.selectedId);
  const metersPerPdfUnit = useAppStore((s) => s.metersPerPdfUnit);
  const addMeasurement = useAppStore((s) => s.addMeasurement);
  const updateMeasurement = useAppStore((s) => s.updateMeasurement);
  const setSelected = useAppStore((s) => s.setSelected);
  const setTool = useAppStore((s) => s.setTool);

  // Click-add tools (polyline / polygon / calibrate)
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // Drag-draw tools (rectangle / ellipse / arrow)
  const [drag, setDrag] = useState<null | { start: Point; end: Point }>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const [shiftHeld, setShiftHeld] = useState(false);
  const [altHeld, setAltHeld] = useState(false);

  const isClickAdd =
    tool === "polyline" || tool === "polygon" || tool === "calibrate";
  const isDragDraw = tool === "rectangle" || tool === "ellipse" || tool === "arrow";
  const isText = tool === "text";
  const drawing = isClickAdd || isDragDraw || isText;

  // Reset draft when tool changes
  useEffect(() => {
    setDraftPoints([]);
    setHoverPoint(null);
    setDrag(null);
  }, [tool]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
      if (e.key === "Alt") setAltHeld(true);
      if (e.key === "Escape") {
        setDraftPoints([]);
        setHoverPoint(null);
        setDrag(null);
      }
      if (e.key === "Enter" && draftPoints.length >= 2) finishClickAddDraft();
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const t = e.target;
        if (
          t instanceof HTMLInputElement ||
          t instanceof HTMLTextAreaElement ||
          (t instanceof HTMLElement && t.isContentEditable)
        )
          return;
        useAppStore.getState().removeMeasurement(selectedId);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
      if (e.key === "Alt") setAltHeld(false);
    };
    const onBlur = () => {
      setShiftHeld(false);
      setAltHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPoints, selectedId, tool]);

  const toScreen = (p: Point): Point => {
    const d = baseToDisplay(p, pageWidth, pageHeight, rotation);
    return {
      x: d.x * fitScale * zoom + pan.x,
      y: d.y * fitScale * zoom + pan.y,
    };
  };
  const toBase = (p: Point): Point => {
    const d = {
      x: (p.x - pan.x) / (fitScale * zoom),
      y: (p.y - pan.y) / (fitScale * zoom),
    };
    return displayToBase(d, pageWidth, pageHeight, rotation);
  };

  // ---- Click-add tools ----
  const handleClickAddMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (!isClickAdd || draftPoints.length === 0) {
      setHoverPoint(null);
      return;
    }
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    let p = toBase(pos);
    if (shiftHeld) p = snapToAngle(draftPoints[draftPoints.length - 1], p);
    setHoverPoint(p);
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawing) {
      if (e.target === e.target.getStage()) setSelected(null);
      return;
    }
    if (e.evt.button !== 0) return;
    if (isText) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const anchor = toBase(pos);
      addMeasurement({
        name: `Note ${useAppStore.getState().measurements.length + 1}`,
        kind: "text",
        points: [anchor],
        color: "#facc15",
        visible: true,
        showMeasurements: true,
        strokeWidth: DEFAULT_STROKE_WIDTH,
        lineStyle: "solid",
        fillOpacity: 0,
        note: "",
        fontSize: DEFAULT_TEXT_FONT_SIZE,
      });
      setTool("select");
      return;
    }
    if (!isClickAdd) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    let p = toBase(pos);
    if (shiftHeld && draftPoints.length > 0) {
      p = snapToAngle(draftPoints[draftPoints.length - 1], p);
    }
    setDraftPoints((prev) => [...prev, p]);
  };

  const handleStageDblClick = () => {
    if (isClickAdd && draftPoints.length >= 2) finishClickAddDraft();
  };

  const finishClickAddDraft = () => {
    if (draftPoints.length < 2) return;
    if (tool === "calibrate") {
      const len = polylineLength(draftPoints);
      onCalibrationDrawn(len);
      setDraftPoints([]);
      setHoverPoint(null);
      return;
    }
    addMeasurement({
      name:
        tool === "polygon"
          ? `Area ${useAppStore.getState().measurements.length + 1}`
          : `Measurement ${useAppStore.getState().measurements.length + 1}`,
      kind: tool === "polygon" ? "polygon" : "polyline",
      points: draftPoints,
      color: "",
      visible: true,
      showMeasurements: true,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      lineStyle: "solid",
      fillOpacity: DEFAULT_FILL_OPACITY,
    });
    setDraftPoints([]);
    setHoverPoint(null);
    setTool("select");
  };

  // ---- Drag-draw tools ----
  const handleDragStart = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (!isDragDraw) return;
    if (e.evt.button !== 0) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const p = toBase(pos);
    setDrag({ start: p, end: p });
  };
  const handleDragMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (!isDragDraw || !dragRef.current) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    let end = toBase(pos);
    const start = dragRef.current.start;
    if (shiftHeld) {
      if (tool === "rectangle" || tool === "ellipse") {
        end = squareFromPoints(start, end).b;
      } else if (tool === "arrow") {
        end = snapToAngle(start, end);
      }
    }
    setDrag({ start, end });
  };
  const handleDragEnd = () => {
    if (!isDragDraw || !drag) return;
    const { start, end } = drag;
    setDrag(null);
    if (distance(start, end) < 1) {
      // No meaningful drag — cancel
      return;
    }
    const kind = tool as "rectangle" | "ellipse" | "arrow";
    const points: Point[] = [start, end];
    addMeasurement({
      name:
        kind === "rectangle"
          ? `Rectangle ${useAppStore.getState().measurements.length + 1}`
          : kind === "ellipse"
            ? `Ellipse ${useAppStore.getState().measurements.length + 1}`
            : `Arrow ${useAppStore.getState().measurements.length + 1}`,
      kind,
      points,
      color: "",
      visible: true,
      showMeasurements: true,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      lineStyle: "solid",
      fillOpacity: kind === "arrow" ? 0 : DEFAULT_FILL_OPACITY,
    });
    setTool("select");
  };

  // Polyline preview while click-adding
  const draftWithHover =
    isClickAdd && hoverPoint && draftPoints.length > 0
      ? [...draftPoints, hoverPoint]
      : draftPoints;

  return (
    <Stage
      width={containerWidth}
      height={containerHeight}
      onMouseMove={(e: Konva.KonvaEventObject<PointerEvent>) => {
        handleClickAddMove(e);
        handleDragMove(e);
      }}
      onMouseDown={(e: Konva.KonvaEventObject<PointerEvent>) => handleDragStart(e)}
      onMouseUp={() => handleDragEnd()}
      onClick={handleStageClick}
      onDblClick={handleStageDblClick}
      style={{
        position: "absolute",
        inset: 0,
        cursor: drawing ? "crosshair" : "default",
        pointerEvents: "auto",
      }}
    >
      <Layer listening={!drawing}>
        {measurements.map((m) =>
          !m.visible ? null : (
            <MeasurementRenderer
              key={m.id}
              m={m}
              toScreen={toScreen}
              toBase={toBase}
              isSelected={m.id === selectedId}
              metersPerPdfUnit={metersPerPdfUnit}
              units={units}
              showLabel={showLabels}
              altHeld={altHeld}
              onSelect={() => setSelected(m.id)}
              onUpdatePoint={(idx, screenPt) => {
                const next = m.points.slice();
                next[idx] = toBase(screenPt);
                updateMeasurement(m.id, { points: next });
              }}
              onTranslate={(dxScreen, dyScreen) => {
                const tx = (p: Point) => {
                  const sp = toScreen(p);
                  return toBase({ x: sp.x + dxScreen, y: sp.y + dyScreen });
                };
                const patch: Partial<Measurement> = {
                  points: m.points.map(tx),
                };
                if (m.noteAnchor) patch.noteAnchor = tx(m.noteAnchor);
                updateMeasurement(m.id, patch);
              }}
              onUpdate={(patch) => updateMeasurement(m.id, patch)}
            />
          ),
        )}
      </Layer>
      <Layer listening={false}>
        {/* Click-add preview */}
        {isClickAdd && draftWithHover.length >= 2 && (
          <ClickAddPreview
            points={draftWithHover}
            committed={draftPoints.length}
            isPolygon={tool === "polygon"}
            isCalibrate={tool === "calibrate"}
            toScreen={toScreen}
            metersPerPdfUnit={metersPerPdfUnit}
            units={units}
            showLabel={showLabels}
          />
        )}
        {isClickAdd &&
          draftPoints.map((p, i) => {
            const sp = toScreen(p);
            return (
              <Circle
                key={i}
                x={sp.x}
                y={sp.y}
                radius={POINT_RADIUS}
                fill="#22d3ee"
                stroke="#0f172a"
                strokeWidth={1}
              />
            );
          })}
        {/* Drag-draw preview */}
        {isDragDraw && drag && (
          <DragDrawPreview
            tool={tool as "rectangle" | "ellipse" | "arrow"}
            start={drag.start}
            end={drag.end}
            toScreen={toScreen}
          />
        )}
      </Layer>
    </Stage>
  );
};

const lineDash = (style: LineStyle, w: number): number[] | undefined => {
  if (style === "solid") return undefined;
  if (style === "dashed") return [w * 4, w * 3];
  return [w * 1, w * 2]; // dotted
};

const ClickAddPreview = ({
  points,
  committed,
  isPolygon,
  isCalibrate,
  toScreen,
  metersPerPdfUnit,
  units,
  showLabel,
}: {
  points: Point[];
  committed: number;
  isPolygon: boolean;
  isCalibrate: boolean;
  toScreen: (p: Point) => Point;
  metersPerPdfUnit: number | null;
  units: UnitSystem;
  showLabel: boolean;
}) => {
  const flat: number[] = [];
  for (const p of points) {
    const sp = toScreen(p);
    flat.push(sp.x, sp.y);
  }
  const length = polylineLength(points);
  const lengthMeters = metersPerPdfUnit != null ? length * metersPerPdfUnit : null;
  const lastSegMeters =
    metersPerPdfUnit != null && points.length >= 2
      ? distance(points[points.length - 2], points[points.length - 1]) *
        metersPerPdfUnit
      : null;
  const labelLines: string[] = [];
  if (isCalibrate) labelLines.push("Calibration");
  if (lengthMeters != null) labelLines.push(`Total ${formatLength(lengthMeters, units)}`);
  if (lastSegMeters != null && points.length > committed)
    labelLines.push(`Seg ${formatLength(lastSegMeters, units)}`);
  const last = toScreen(points[points.length - 1]);

  const inlineBase = points[points.length - 1];
  const dummyShapeAttach = (q: Point) => q;

  return (
    <Group>
      <Line
        points={flat}
        closed={isPolygon && points.length > 2}
        stroke={isCalibrate ? "#facc15" : "#22d3ee"}
        strokeWidth={2}
        dash={[6, 4]}
        listening={false}
      />
      {showLabel && labelLines.length > 0 && (
        <AnnotationLabel
          lines={labelLines}
          inlineBaseAnchor={inlineBase}
          noteAnchorBase={null}
          shapeAttachBase={dummyShapeAttach}
          toScreen={() => last}
          toBase={() => inlineBase}
          draggable={false}
          color="#22d3ee"
          textColor={isCalibrate ? "#fef3c7" : "#f8fafc"}
          onMoveAnchor={() => undefined}
          onClearAnchor={() => undefined}
        />
      )}
    </Group>
  );
};

const DragDrawPreview = ({
  tool,
  start,
  end,
  toScreen,
}: {
  tool: "rectangle" | "ellipse" | "arrow";
  start: Point;
  end: Point;
  toScreen: (p: Point) => Point;
}) => {
  const a = toScreen(start);
  const b = toScreen(end);
  if (tool === "rectangle") {
    const r = rectFromPoints(a, b);
    return (
      <KRect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        stroke="#22d3ee"
        strokeWidth={2}
        dash={[6, 4]}
        listening={false}
      />
    );
  }
  if (tool === "ellipse") {
    const r = rectFromPoints(a, b);
    return (
      <Ellipse
        x={r.x + r.width / 2}
        y={r.y + r.height / 2}
        radiusX={r.width / 2}
        radiusY={r.height / 2}
        stroke="#22d3ee"
        strokeWidth={2}
        dash={[6, 4]}
        listening={false}
      />
    );
  }
  return (
    <Arrow
      points={[a.x, a.y, b.x, b.y]}
      stroke="#22d3ee"
      fill="#22d3ee"
      strokeWidth={2}
      dash={[6, 4]}
      pointerLength={10}
      pointerWidth={10}
      listening={false}
    />
  );
};

// ============================================================================
// Per-measurement renderer
// ============================================================================

type RendererProps = {
  m: Measurement;
  toScreen: (p: Point) => Point;
  toBase: (p: Point) => Point;
  isSelected: boolean;
  altHeld: boolean;
  metersPerPdfUnit: number | null;
  units: UnitSystem;
  showLabel: boolean;
  onSelect: () => void;
  onUpdatePoint: (idx: number, screenPt: Point) => void;
  onTranslate: (dxScreen: number, dyScreen: number) => void;
  onUpdate: (patch: Partial<Measurement>) => void;
};

const dragGroupProps = (
  draggable: boolean,
  onTranslate: (dx: number, dy: number) => void,
) => ({
  draggable,
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
    const dx = e.target.x();
    const dy = e.target.y();
    e.target.x(0);
    e.target.y(0);
    if (dx !== 0 || dy !== 0) onTranslate(dx, dy);
  },
  onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!draggable) return;
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = "move";
  },
  onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = "";
  },
});

const MeasurementRenderer = (props: RendererProps) => {
  const { m } = props;
  switch (m.kind) {
    case "polyline":
    case "polygon":
      return <PolylinePolygonShape {...props} />;
    case "rectangle":
      return <RectangleShape {...props} />;
    case "ellipse":
      return <EllipseShape {...props} />;
    case "arrow":
      return <ArrowShape {...props} />;
    case "text":
      return <TextShape {...props} />;
  }
};

const handleR = (sel: boolean) =>
  sel ? POINT_RADIUS_SELECTED : POINT_RADIUS;

const buildAutoLabelLines = (
  m: Measurement,
  metersPerPdfUnit: number | null,
  units: UnitSystem,
): string[] => {
  const lines: string[] = [];
  if (m.kind === "text") {
    if (m.note) lines.push(m.note);
    return lines;
  }
  if (m.showMeasurements) {
    lines.push(m.name);
    if (metersPerPdfUnit != null) {
      if (m.kind === "polyline" || m.kind === "arrow") {
        const raw = polylineLength(m.points) * metersPerPdfUnit;
        const sb = m.bufferStartPercent ?? 0;
        const eb = m.bufferEndPercent ?? 0;
        const total = raw * (1 + (sb + eb) / 100);
        if (sb !== 0 || eb !== 0) {
          lines.push(`${formatLength(raw, units)} +${sb}% +${eb}%`);
          lines.push(`= ${formatLength(total, units)}`);
        } else {
          lines.push(formatLength(raw, units));
        }
      } else if (m.kind === "polygon") {
        const len = polylineLength(m.points) * metersPerPdfUnit;
        const area = polygonArea(m.points) * metersPerPdfUnit * metersPerPdfUnit;
        lines.push(formatLength(len, units));
        lines.push(formatArea(area, units));
      } else if (m.kind === "rectangle" || m.kind === "ellipse") {
        const r = rectFromPoints(m.points[0], m.points[1]);
        const w = r.width * metersPerPdfUnit;
        const h = r.height * metersPerPdfUnit;
        lines.push(`${formatLength(w, units)} × ${formatLength(h, units)}`);
        const area =
          m.kind === "rectangle"
            ? w * h
            : Math.PI * (w / 2) * (h / 2);
        lines.push(formatArea(area, units));
      }
    }
  }
  if (m.note) lines.push(m.note);
  return lines;
};

const inlineAnchorFor = (m: Measurement): Point => {
  if (m.points.length === 0) return { x: 0, y: 0 };
  if (m.kind === "polygon") return centroid(m.points);
  if (m.kind === "polyline" || m.kind === "arrow")
    return m.points[Math.floor(m.points.length / 2)];
  if (m.kind === "rectangle" || m.kind === "ellipse") {
    const r = rectFromPoints(m.points[0], m.points[1]);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }
  return m.points[0];
};

const shapeAttachFor = (m: Measurement, qBase: Point): Point => {
  if (m.points.length === 0) return qBase;
  if (m.kind === "polyline" || m.kind === "arrow")
    return closestPointOnPolyline(m.points, qBase);
  if (m.kind === "polygon") {
    const closed = [...m.points, m.points[0]];
    return closestPointOnPolyline(closed, qBase);
  }
  if (m.kind === "rectangle") {
    const r: GeomRect = rectFromPoints(m.points[0], m.points[1]);
    return closestPointOnRect(r, qBase);
  }
  if (m.kind === "ellipse") {
    const r = rectFromPoints(m.points[0], m.points[1]);
    return closestPointOnEllipse(
      r.x + r.width / 2,
      r.y + r.height / 2,
      r.width / 2,
      r.height / 2,
      qBase,
    );
  }
  return m.points[0];
};

// ----------------------------------------------------------------------------

const PolylinePolygonShape = (p: RendererProps) => {
  const { m, toScreen, toBase, isSelected, altHeld, metersPerPdfUnit, units, showLabel, onSelect, onUpdatePoint, onTranslate, onUpdate } = p;
  const flat: number[] = [];
  for (const pt of m.points) {
    const sp = toScreen(pt);
    flat.push(sp.x, sp.y);
  }
  const sw = m.strokeWidth + (isSelected ? 1 : 0);
  return (
    <Group
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      {...dragGroupProps(isSelected && altHeld, onTranslate)}
    >
      <Line
        points={flat}
        stroke={m.color}
        strokeWidth={sw}
        closed={m.kind === "polygon"}
        fill={
          m.kind === "polygon" && m.fillOpacity > 0
            ? hexWithAlpha(m.color, m.fillOpacity)
            : undefined
        }
        dash={lineDash(m.lineStyle, sw)}
        hitStrokeWidth={Math.max(12, sw + 8)}
      />
      {isSelected &&
        m.points.map((pt, i) => {
          const sp = toScreen(pt);
          return (
            <Circle
              key={i}
              x={sp.x}
              y={sp.y}
              radius={handleR(true)}
              fill={m.color}
              stroke="#0f172a"
              strokeWidth={1}
              draggable
              onDragMove={(e) =>
                onUpdatePoint(i, { x: e.target.x(), y: e.target.y() })
              }
            />
          );
        })}
      {showLabel && (
        <AnnotationLabel
          lines={buildAutoLabelLines(m, metersPerPdfUnit, units)}
          inlineBaseAnchor={inlineAnchorFor(m)}
          noteAnchorBase={m.noteAnchor ?? null}
          shapeAttachBase={(q) => shapeAttachFor(m, q)}
          toScreen={toScreen}
          toBase={toBase}
          draggable={isSelected}
          color={m.color}
          onMoveAnchor={(a) => onUpdate({ noteAnchor: a })}
          onClearAnchor={() => onUpdate({ noteAnchor: null })}
        />
      )}
    </Group>
  );
};

const RectangleShape = (p: RendererProps) => {
  const { m, toScreen, toBase, isSelected, altHeld, metersPerPdfUnit, units, showLabel, onSelect, onUpdatePoint, onTranslate, onUpdate } = p;
  const a = toScreen(m.points[0]);
  const b = toScreen(m.points[1]);
  const r = rectFromPoints(a, b);
  const sw = m.strokeWidth + (isSelected ? 1 : 0);
  return (
    <Group
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      {...dragGroupProps(isSelected && altHeld, onTranslate)}
    >
      <KRect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        stroke={m.color}
        strokeWidth={sw}
        fill={m.fillOpacity > 0 ? hexWithAlpha(m.color, m.fillOpacity) : undefined}
        dash={lineDash(m.lineStyle, sw)}
      />
      {isSelected &&
        [m.points[0], m.points[1]].map((pt, i) => {
          const sp = toScreen(pt);
          return (
            <Circle
              key={i}
              x={sp.x}
              y={sp.y}
              radius={handleR(true)}
              fill={m.color}
              stroke="#0f172a"
              strokeWidth={1}
              draggable
              onDragMove={(e) =>
                onUpdatePoint(i, { x: e.target.x(), y: e.target.y() })
              }
            />
          );
        })}
      {showLabel && (
        <AnnotationLabel
          lines={buildAutoLabelLines(m, metersPerPdfUnit, units)}
          inlineBaseAnchor={inlineAnchorFor(m)}
          noteAnchorBase={m.noteAnchor ?? null}
          shapeAttachBase={(q) => shapeAttachFor(m, q)}
          toScreen={toScreen}
          toBase={toBase}
          draggable={isSelected}
          color={m.color}
          onMoveAnchor={(a) => onUpdate({ noteAnchor: a })}
          onClearAnchor={() => onUpdate({ noteAnchor: null })}
        />
      )}
    </Group>
  );
};

const EllipseShape = (p: RendererProps) => {
  const { m, toScreen, toBase, isSelected, altHeld, metersPerPdfUnit, units, showLabel, onSelect, onUpdatePoint, onTranslate, onUpdate } = p;
  const a = toScreen(m.points[0]);
  const b = toScreen(m.points[1]);
  const r = rectFromPoints(a, b);
  const sw = m.strokeWidth + (isSelected ? 1 : 0);
  return (
    <Group
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      {...dragGroupProps(isSelected && altHeld, onTranslate)}
    >
      <Ellipse
        x={r.x + r.width / 2}
        y={r.y + r.height / 2}
        radiusX={r.width / 2}
        radiusY={r.height / 2}
        stroke={m.color}
        strokeWidth={sw}
        fill={m.fillOpacity > 0 ? hexWithAlpha(m.color, m.fillOpacity) : undefined}
        dash={lineDash(m.lineStyle, sw)}
      />
      {isSelected &&
        [m.points[0], m.points[1]].map((pt, i) => {
          const sp = toScreen(pt);
          return (
            <Circle
              key={i}
              x={sp.x}
              y={sp.y}
              radius={handleR(true)}
              fill={m.color}
              stroke="#0f172a"
              strokeWidth={1}
              draggable
              onDragMove={(e) =>
                onUpdatePoint(i, { x: e.target.x(), y: e.target.y() })
              }
            />
          );
        })}
      {showLabel && (
        <AnnotationLabel
          lines={buildAutoLabelLines(m, metersPerPdfUnit, units)}
          inlineBaseAnchor={inlineAnchorFor(m)}
          noteAnchorBase={m.noteAnchor ?? null}
          shapeAttachBase={(q) => shapeAttachFor(m, q)}
          toScreen={toScreen}
          toBase={toBase}
          draggable={isSelected}
          color={m.color}
          onMoveAnchor={(a) => onUpdate({ noteAnchor: a })}
          onClearAnchor={() => onUpdate({ noteAnchor: null })}
        />
      )}
    </Group>
  );
};

const ArrowShape = (p: RendererProps) => {
  const { m, toScreen, toBase, isSelected, altHeld, metersPerPdfUnit, units, showLabel, onSelect, onUpdatePoint, onTranslate, onUpdate } = p;
  const a = toScreen(m.points[0]);
  const b = toScreen(m.points[1]);
  const sw = m.strokeWidth + (isSelected ? 1 : 0);
  return (
    <Group
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      {...dragGroupProps(isSelected && altHeld, onTranslate)}
    >
      <Arrow
        points={[a.x, a.y, b.x, b.y]}
        stroke={m.color}
        fill={m.color}
        strokeWidth={sw}
        dash={lineDash(m.lineStyle, sw)}
        pointerLength={Math.max(8, sw * 4)}
        pointerWidth={Math.max(8, sw * 4)}
        hitStrokeWidth={Math.max(12, sw + 8)}
      />
      {isSelected &&
        [m.points[0], m.points[1]].map((pt, i) => {
          const sp = toScreen(pt);
          return (
            <Circle
              key={i}
              x={sp.x}
              y={sp.y}
              radius={handleR(true)}
              fill={m.color}
              stroke="#0f172a"
              strokeWidth={1}
              draggable
              onDragMove={(e) =>
                onUpdatePoint(i, { x: e.target.x(), y: e.target.y() })
              }
            />
          );
        })}
      {showLabel && (
        <AnnotationLabel
          lines={buildAutoLabelLines(m, metersPerPdfUnit, units)}
          inlineBaseAnchor={inlineAnchorFor(m)}
          noteAnchorBase={m.noteAnchor ?? null}
          shapeAttachBase={(q) => shapeAttachFor(m, q)}
          toScreen={toScreen}
          toBase={toBase}
          draggable={isSelected}
          color={m.color}
          onMoveAnchor={(a) => onUpdate({ noteAnchor: a })}
          onClearAnchor={() => onUpdate({ noteAnchor: null })}
        />
      )}
    </Group>
  );
};

const TextShape = (p: RendererProps) => {
  const { m, toScreen, toBase, isSelected, altHeld, onSelect, onUpdatePoint, onTranslate, onUpdate } = p;
  const a = toScreen(m.points[0]);
  const lines = m.note ? m.note.split("\n") : ["(empty note)"];
  const fontSize = m.fontSize ?? DEFAULT_TEXT_FONT_SIZE;
  void fontSize; // Note: AnnotationLabel uses its own font size; future: support per-shape.
  return (
    <Group
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      {...dragGroupProps(isSelected && altHeld, onTranslate)}
    >
      {/* Anchor dot */}
      <Circle
        x={a.x}
        y={a.y}
        radius={isSelected ? 5 : 3}
        fill={m.color}
        stroke="#0f172a"
        strokeWidth={1}
        draggable
        onDragMove={(e) =>
          onUpdatePoint(0, { x: e.target.x(), y: e.target.y() })
        }
      />
      <AnnotationLabel
        lines={lines}
        inlineBaseAnchor={m.points[0]}
        noteAnchorBase={m.noteAnchor ?? null}
        shapeAttachBase={() => m.points[0]}
        toScreen={toScreen}
        toBase={toBase}
        draggable={isSelected}
        color={m.color}
        textColor={m.color}
        onMoveAnchor={(a) => onUpdate({ noteAnchor: a })}
        onClearAnchor={() => onUpdate({ noteAnchor: null })}
      />
    </Group>
  );
};

const centroid = (pts: Point[]): Point => {
  const s = pts.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: s.x / pts.length, y: s.y / pts.length };
};

// Convert "#rrggbb" + alpha 0..1 → "#rrggbbAA"
const hexWithAlpha = (hex: string, alpha: number): string => {
  const a = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0");
  if (hex.length === 7) return `${hex}${aa}`;
  // Already has alpha, replace
  if (hex.length === 9) return `${hex.slice(0, 7)}${aa}`;
  return hex;
};
