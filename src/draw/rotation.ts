import type { Point } from "./geometry";

export type Rotation = 0 | 90 | 180 | 270;

export const normalizeRotation = (deg: number): Rotation => {
  const r = ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
  return r as Rotation;
};

export const displayDims = (
  baseW: number,
  baseH: number,
  rotation: Rotation,
): { width: number; height: number } => {
  if (rotation === 90 || rotation === 270) {
    return { width: baseH, height: baseW };
  }
  return { width: baseW, height: baseH };
};

/** Convert a point in base PDF coords (rotation 0) to display coords for the given rotation. */
export const baseToDisplay = (
  p: Point,
  baseW: number,
  baseH: number,
  rotation: Rotation,
): Point => {
  switch (rotation) {
    case 0:
      return { x: p.x, y: p.y };
    case 90:
      return { x: baseH - p.y, y: p.x };
    case 180:
      return { x: baseW - p.x, y: baseH - p.y };
    case 270:
      return { x: p.y, y: baseW - p.x };
  }
};

/** Inverse of baseToDisplay. */
export const displayToBase = (
  p: Point,
  baseW: number,
  baseH: number,
  rotation: Rotation,
): Point => {
  switch (rotation) {
    case 0:
      return { x: p.x, y: p.y };
    case 90:
      return { x: p.y, y: baseH - p.x };
    case 180:
      return { x: baseW - p.x, y: baseH - p.y };
    case 270:
      return { x: baseW - p.y, y: p.x };
  }
};
