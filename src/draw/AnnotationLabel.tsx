import { Group, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { Point } from "./geometry";

const FONT_SIZE = 12;
const LABEL_PADDING = 4;
const LABEL_GAP = 8;
const LINE_HEIGHT = 1.2;

const measureLabelDims = (lines: string[]) => {
  const charW = FONT_SIZE * 0.6;
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  return {
    width: longest * charW + LABEL_PADDING * 2,
    height: lines.length * (FONT_SIZE * LINE_HEIGHT) + LABEL_PADDING * 2,
  };
};

type Props = {
  /** Lines of text to render */
  lines: string[];
  /** Inline position (base PDF coords) when noteAnchor is null */
  inlineBaseAnchor: Point;
  /** Optional suspended position (base PDF coords) */
  noteAnchorBase: Point | null | undefined;
  /** Get the point on the shape outline nearest the label centre — for leader-line connection */
  shapeAttachBase: (queryBase: Point) => Point;
  toScreen: (p: Point) => Point;
  /** Inverse of toScreen — for converting drag coordinates back to base */
  toBase: (screen: Point) => Point;
  /** Render the label as draggable (only when measurement is selected) */
  draggable: boolean;
  color: string;
  /** Called when the label is dragged to a new position */
  onMoveAnchor: (newAnchorBase: Point | null) => void;
  /** Called when the label is double-clicked — clears noteAnchor (snap back inline) */
  onClearAnchor: () => void;
  textColor?: string;
};

export const AnnotationLabel = ({
  lines,
  inlineBaseAnchor,
  noteAnchorBase,
  shapeAttachBase,
  toScreen,
  toBase,
  draggable,
  color,
  onMoveAnchor,
  onClearAnchor,
  textColor = "#f8fafc",
}: Props) => {
  if (lines.length === 0) return null;
  const dims = measureLabelDims(lines);
  const inline = !noteAnchorBase;
  // Anchor for label box top-left in base coords
  let anchorBase: Point;
  if (inline) {
    // Offset from inline anchor (centroid / midpoint) so it doesn't sit dead-on the shape
    anchorBase = {
      x: inlineBaseAnchor.x,
      y: inlineBaseAnchor.y,
    };
  } else {
    anchorBase = noteAnchorBase!;
  }
  const anchorScreen = toScreen(anchorBase);
  const labelScreenX = inline ? anchorScreen.x + LABEL_GAP : anchorScreen.x;
  const labelScreenY = inline ? anchorScreen.y + LABEL_GAP : anchorScreen.y;

  // Leader line (when suspended): from box centre back to shape attachment point
  let leader: { ax: number; ay: number; bx: number; by: number } | null = null;
  if (!inline) {
    const labelCentreScreen = {
      x: labelScreenX + dims.width / 2,
      y: labelScreenY + dims.height / 2,
    };
    const labelCentreBase = toBase(labelCentreScreen);
    const attachBase = shapeAttachBase(labelCentreBase);
    const attachScreen = toScreen(attachBase);
    // Endpoint on the box border closest to the attach point
    const boxEdge = closestEdgePoint(
      { x: labelScreenX, y: labelScreenY, width: dims.width, height: dims.height },
      attachScreen,
    );
    leader = { ax: boxEdge.x, ay: boxEdge.y, bx: attachScreen.x, by: attachScreen.y };
  }

  return (
    <Group listening>
      {leader && (
        <Line
          points={[leader.ax, leader.ay, leader.bx, leader.by]}
          stroke={color}
          strokeWidth={1}
          opacity={0.6}
          dash={[4, 3]}
          listening={false}
        />
      )}
      <Group
        x={labelScreenX}
        y={labelScreenY}
        draggable={draggable}
        onDragStart={(e) => {
          // Stop the drag from being interpreted as a translate of the parent
          // shape (the outer shape group also listens for drag events).
          e.cancelBubble = true;
        }}
        onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
          e.cancelBubble = true;
          const newScreen = { x: e.target.x(), y: e.target.y() };
          // Convert to base PDF coords
          const newBase = toBase(newScreen);
          onMoveAnchor(newBase);
        }}
        onDblClick={(e) => {
          e.cancelBubble = true;
          onClearAnchor();
        }}
        onMouseEnter={(e) => {
          if (!draggable) return;
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "move";
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "";
        }}
      >
        <Rect
          width={dims.width}
          height={dims.height}
          fill="rgba(15, 23, 42, 0.92)"
          stroke="rgba(148, 163, 184, 0.45)"
          strokeWidth={1}
          cornerRadius={4}
        />
        <Text
          x={LABEL_PADDING}
          y={LABEL_PADDING}
          text={lines.join("\n")}
          fontSize={FONT_SIZE}
          fontStyle="600"
          fill={textColor}
          lineHeight={LINE_HEIGHT}
        />
      </Group>
    </Group>
  );
};

const closestEdgePoint = (
  r: { x: number; y: number; width: number; height: number },
  q: { x: number; y: number },
): Point => {
  // Project q onto the rectangle border (assume q is outside the rect or on its edge)
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const dx = q.x - cx;
  const dy = q.y - cy;
  const halfW = r.width / 2;
  const halfH = r.height / 2;
  if (dx === 0 && dy === 0) return { x: cx, y: r.y };
  const slope = halfH * Math.abs(dx);
  const slopeAlt = halfW * Math.abs(dy);
  if (slope >= slopeAlt) {
    // Hits left/right edge
    const sign = Math.sign(dx) || 1;
    const t = halfW / Math.abs(dx);
    return { x: cx + sign * halfW, y: cy + dy * t };
  }
  // Hits top/bottom edge
  const sign = Math.sign(dy) || 1;
  const t = halfH / Math.abs(dy);
  return { x: cx + dx * t, y: cy + sign * halfH };
};
