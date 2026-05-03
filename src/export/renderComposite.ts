import type { PDFPageProxy } from "pdfjs-dist";
import type { LineStyle, Measurement } from "../state/store";
import {
  closestPointOnEllipse,
  closestPointOnPolyline,
  closestPointOnRect,
  polygonArea,
  polylineLength,
  rectFromPoints,
  type Point,
  type Rect,
} from "../draw/geometry";
import {
  baseToDisplay,
  displayDims,
  type Rotation,
} from "../draw/rotation";
import { formatArea, formatLength, type UnitSystem } from "../lib/units";

export type CompositeOptions = {
  page: PDFPageProxy;
  pageWidth: number;
  pageHeight: number;
  rotation: Rotation;
  measurements: Measurement[];
  metersPerPdfUnit: number | null;
  units: UnitSystem;
  showLabels: boolean;
  scale?: number;
};

const FONT_SIZE = 11;
const LINE_HEIGHT = 13;
const LABEL_PADDING = 4;

export const renderComposite = async (
  opts: CompositeOptions,
): Promise<HTMLCanvasElement> => {
  const scale = opts.scale ?? 2;
  const vp = opts.page.getViewport({ scale, rotation: opts.rotation });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  await opts.page.render({ canvasContext: ctx, viewport: vp }).promise;

  ctx.save();
  ctx.scale(scale, scale);
  drawOverlay(ctx, opts);
  ctx.restore();
  return canvas;
};

const setLineStyle = (
  ctx: CanvasRenderingContext2D,
  style: LineStyle,
  width: number,
) => {
  if (style === "solid") ctx.setLineDash([]);
  else if (style === "dashed") ctx.setLineDash([width * 4, width * 3]);
  else ctx.setLineDash([width * 1, width * 2]);
};

const drawOverlay = (
  ctx: CanvasRenderingContext2D,
  opts: CompositeOptions,
) => {
  const toDisp = (p: Point) =>
    baseToDisplay(p, opts.pageWidth, opts.pageHeight, opts.rotation);

  for (const m of opts.measurements) {
    if (!m.visible || m.points.length === 0) continue;
    drawShape(ctx, m, toDisp);
    if (opts.showLabels) drawAnnotation(ctx, m, toDisp, opts);
  }
};

const drawShape = (
  ctx: CanvasRenderingContext2D,
  m: Measurement,
  toDisp: (p: Point) => Point,
) => {
  if (m.kind === "text") return; // No outline; label drawn in drawAnnotation
  const dispPts = m.points.map(toDisp);
  ctx.save();
  ctx.lineWidth = m.strokeWidth;
  ctx.strokeStyle = m.color;
  ctx.fillStyle = hexWithAlpha(m.color, m.fillOpacity);
  setLineStyle(ctx, m.lineStyle, m.strokeWidth);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (m.kind === "polyline") {
    ctx.beginPath();
    dispPts.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
    ctx.stroke();
  } else if (m.kind === "polygon") {
    ctx.beginPath();
    dispPts.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
    ctx.closePath();
    if (m.fillOpacity > 0) ctx.fill();
    ctx.stroke();
  } else if (m.kind === "rectangle") {
    if (dispPts.length >= 2) {
      const r = rectFromPoints(dispPts[0], dispPts[1]);
      if (m.fillOpacity > 0) ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.strokeRect(r.x, r.y, r.width, r.height);
    }
  } else if (m.kind === "ellipse") {
    if (dispPts.length >= 2) {
      const r = rectFromPoints(dispPts[0], dispPts[1]);
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r.width / 2, r.height / 2, 0, 0, Math.PI * 2);
      if (m.fillOpacity > 0) ctx.fill();
      ctx.stroke();
    }
  } else if (m.kind === "arrow") {
    if (dispPts.length >= 2) {
      const a = dispPts[0];
      const b = dispPts[1];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      // Arrowhead
      ctx.setLineDash([]);
      const headLen = Math.max(8, m.strokeWidth * 4);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(
        b.x - headLen * Math.cos(angle - Math.PI / 6),
        b.y - headLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        b.x - headLen * Math.cos(angle + Math.PI / 6),
        b.y - headLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fillStyle = m.color;
      ctx.fill();
    }
  }
  ctx.restore();
};

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
        lines.push(formatLength(polylineLength(m.points) * metersPerPdfUnit, units));
        lines.push(
          formatArea(
            polygonArea(m.points) * metersPerPdfUnit * metersPerPdfUnit,
            units,
          ),
        );
      } else if (
        (m.kind === "rectangle" || m.kind === "ellipse") &&
        m.points.length >= 2
      ) {
        const r = rectFromPoints(m.points[0], m.points[1]);
        const w = r.width * metersPerPdfUnit;
        const h = r.height * metersPerPdfUnit;
        lines.push(`${formatLength(w, units)} × ${formatLength(h, units)}`);
        const area =
          m.kind === "rectangle" ? w * h : Math.PI * (w / 2) * (h / 2);
        lines.push(formatArea(area, units));
      }
    }
  }
  if (m.note) lines.push(m.note);
  return lines;
};

const inlineAnchorBase = (m: Measurement): Point => {
  if (m.points.length === 0) return { x: 0, y: 0 };
  if (m.kind === "polygon") return centroid(m.points);
  if (m.kind === "rectangle" || m.kind === "ellipse") {
    const r = rectFromPoints(m.points[0], m.points[1]);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }
  if (m.kind === "polyline" || m.kind === "arrow")
    return m.points[Math.floor(m.points.length / 2)];
  return m.points[0];
};

const shapeAttachBase = (m: Measurement, q: Point): Point => {
  if (m.points.length === 0) return q;
  if (m.kind === "polyline" || m.kind === "arrow")
    return closestPointOnPolyline(m.points, q);
  if (m.kind === "polygon")
    return closestPointOnPolyline([...m.points, m.points[0]], q);
  if (m.kind === "rectangle") {
    const r: Rect = rectFromPoints(m.points[0], m.points[1]);
    return closestPointOnRect(r, q);
  }
  if (m.kind === "ellipse") {
    const r = rectFromPoints(m.points[0], m.points[1]);
    return closestPointOnEllipse(
      r.x + r.width / 2,
      r.y + r.height / 2,
      r.width / 2,
      r.height / 2,
      q,
    );
  }
  return m.points[0];
};

const drawAnnotation = (
  ctx: CanvasRenderingContext2D,
  m: Measurement,
  toDisp: (p: Point) => Point,
  opts: CompositeOptions,
) => {
  const lines = buildAutoLabelLines(m, opts.metersPerPdfUnit, opts.units);
  if (lines.length === 0) return;
  const dims = measureLabel(ctx, lines);

  let labelTopLeft: Point;
  let leaderTo: Point | null = null;
  if (m.noteAnchor) {
    labelTopLeft = toDisp(m.noteAnchor);
    // Leader: from box centre to nearest point on shape outline (in base coords)
    const labelCentreBase = {
      x: m.noteAnchor.x + dims.width / 2,
      y: m.noteAnchor.y + dims.height / 2,
    };
    const attachBase = shapeAttachBase(m, labelCentreBase);
    leaderTo = toDisp(attachBase);
  } else {
    const inline = toDisp(inlineAnchorBase(m));
    labelTopLeft = { x: inline.x + 6, y: inline.y + 6 };
  }

  if (leaderTo) {
    const labelCentre = {
      x: labelTopLeft.x + dims.width / 2,
      y: labelTopLeft.y + dims.height / 2,
    };
    const edge = closestEdgePoint(
      { x: labelTopLeft.x, y: labelTopLeft.y, width: dims.width, height: dims.height },
      leaderTo.x === labelCentre.x && leaderTo.y === labelCentre.y
        ? { x: labelCentre.x + 1, y: labelCentre.y }
        : leaderTo,
    );
    ctx.save();
    ctx.strokeStyle = m.color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(edge.x, edge.y);
    ctx.lineTo(leaderTo.x, leaderTo.y);
    ctx.stroke();
    ctx.restore();
  }

  drawLabelBox(ctx, labelTopLeft.x, labelTopLeft.y, dims, lines, m.kind === "text" ? m.color : "#f8fafc");
};

const measureLabel = (
  ctx: CanvasRenderingContext2D,
  lines: string[],
): { width: number; height: number } => {
  ctx.font = `600 ${FONT_SIZE}px ui-sans-serif, system-ui, sans-serif`;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const w = Math.max(...widths, 0) + LABEL_PADDING * 2;
  const h = lines.length * LINE_HEIGHT + LABEL_PADDING * 2;
  return { width: w, height: h };
};

const drawLabelBox = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dims: { width: number; height: number },
  lines: string[],
  textColor: string,
) => {
  ctx.save();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  roundedRect(ctx, x, y, dims.width, dims.height, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = `600 ${FONT_SIZE}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, x + LABEL_PADDING, y + LABEL_PADDING + i * LINE_HEIGHT);
  });
  ctx.restore();
};

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const closestEdgePoint = (
  r: { x: number; y: number; width: number; height: number },
  q: Point,
): Point => {
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
    const sign = Math.sign(dx) || 1;
    const t = halfW / Math.abs(dx);
    return { x: cx + sign * halfW, y: cy + dy * t };
  }
  const sign = Math.sign(dy) || 1;
  const t = halfH / Math.abs(dy);
  return { x: cx + dx * t, y: cy + sign * halfH };
};

const centroid = (pts: Point[]): Point => {
  const s = pts.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: s.x / pts.length, y: s.y / pts.length };
};

const hexWithAlpha = (hex: string, alpha: number): string => {
  const a = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0");
  if (hex.length === 7) return `${hex}${aa}`;
  if (hex.length === 9) return `${hex.slice(0, 7)}${aa}`;
  return hex;
};

export const exportPageDims = (
  pageWidth: number,
  pageHeight: number,
  rotation: Rotation,
) => displayDims(pageWidth, pageHeight, rotation);
