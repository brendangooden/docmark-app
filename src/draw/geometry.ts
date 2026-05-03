export type Point = { x: number; y: number };

export const distance = (a: Point, b: Point): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

export const polylineLength = (pts: Point[]): number => {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += distance(pts[i - 1], pts[i]);
  return total;
};

export const polygonArea = (pts: Point[]): number => {
  if (pts.length < 3) return 0;
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    s += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  }
  return Math.abs(s) / 2;
};

const SNAP_RAD = (Math.PI / 180) * 45;

export const snapToAngle = (origin: Point, p: Point): Point => {
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return p;
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / SNAP_RAD) * SNAP_RAD;
  return {
    x: origin.x + Math.cos(snapped) * len,
    y: origin.y + Math.sin(snapped) * len,
  };
};

export const polylineCentroid = (pts: Point[]): Point => {
  if (pts.length === 0) return { x: 0, y: 0 };
  const s = pts.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: s.x / pts.length, y: s.y / pts.length };
};

export type Rect = { x: number; y: number; width: number; height: number };

/** Build a rectangle (top-left + size) from any two diagonal points. */
export const rectFromPoints = (a: Point, b: Point): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y);
  return { x, y, width, height };
};

/** Square the rectangle around its centre, snapping to the larger of |dx|, |dy|. */
export const squareFromPoints = (a: Point, b: Point): { a: Point; b: Point } => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    a,
    b: {
      x: a.x + Math.sign(dx || 1) * m,
      y: a.y + Math.sign(dy || 1) * m,
    },
  };
};

/** Approximate ellipse perimeter (Ramanujan I) for label total — unused for now but handy. */
export const ellipsePerimeter = (rx: number, ry: number): number => {
  const h = ((rx - ry) / (rx + ry)) ** 2;
  return Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
};

/** Closest point on a rectangle's outline to a query point — used for leader-line anchor. */
export const closestPointOnRect = (r: Rect, q: Point): Point => {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  if (q.x === cx && q.y === cy) return { x: cx, y: r.y };
  // Clamp to rectangle, then push to the nearest edge
  const clampedX = Math.max(r.x, Math.min(r.x + r.width, q.x));
  const clampedY = Math.max(r.y, Math.min(r.y + r.height, q.y));
  // If q is inside the rect, project to nearest edge
  const inside =
    q.x >= r.x && q.x <= r.x + r.width && q.y >= r.y && q.y <= r.y + r.height;
  if (inside) {
    const dLeft = q.x - r.x;
    const dRight = r.x + r.width - q.x;
    const dTop = q.y - r.y;
    const dBottom = r.y + r.height - q.y;
    const m = Math.min(dLeft, dRight, dTop, dBottom);
    if (m === dLeft) return { x: r.x, y: q.y };
    if (m === dRight) return { x: r.x + r.width, y: q.y };
    if (m === dTop) return { x: q.x, y: r.y };
    return { x: q.x, y: r.y + r.height };
  }
  return { x: clampedX, y: clampedY };
};

/** Closest point on a polyline to a query point. */
export const closestPointOnPolyline = (pts: Point[], q: Point): Point => {
  if (pts.length === 0) return q;
  if (pts.length === 1) return pts[0];
  let best = pts[0];
  let bestDist = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const denom = abx * abx + aby * aby;
    let t = denom === 0 ? 0 : ((q.x - a.x) * abx + (q.y - a.y) * aby) / denom;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + t * abx;
    const py = a.y + t * aby;
    const d = (px - q.x) ** 2 + (py - q.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = { x: px, y: py };
    }
  }
  return best;
};

/** Closest point on an axis-aligned ellipse outline to a query point (numeric). */
export const closestPointOnEllipse = (cx: number, cy: number, rx: number, ry: number, q: Point): Point => {
  if (rx === 0 || ry === 0) return { x: cx, y: cy };
  const dx = q.x - cx;
  const dy = q.y - cy;
  const t = Math.atan2(dy * rx, dx * ry);
  return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
};
