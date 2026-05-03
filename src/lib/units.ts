export type LengthUnit = "mm" | "m" | "ft" | "in";
export type UnitSystem = "metric" | "imperial";

const METERS_PER: Record<LengthUnit, number> = {
  mm: 0.001,
  m: 1,
  ft: 0.3048,
  in: 0.0254,
};

export const toMeters = (value: number, unit: LengthUnit): number =>
  value * METERS_PER[unit];

export const fromMeters = (meters: number, unit: LengthUnit): number =>
  meters / METERS_PER[unit];

export const formatLength = (
  meters: number,
  system: UnitSystem,
  precision = 2,
): string => {
  if (system === "metric") {
    if (Math.abs(meters) >= 1) return `${meters.toFixed(precision)} m`;
    return `${(meters * 1000).toFixed(0)} mm`;
  }
  const feet = meters / METERS_PER.ft;
  if (Math.abs(feet) >= 1) {
    const whole = Math.floor(feet);
    const inches = (feet - whole) * 12;
    return `${whole}' ${inches.toFixed(1)}"`;
  }
  const inches = meters / METERS_PER.in;
  return `${inches.toFixed(1)}"`;
};

export const formatArea = (
  squareMeters: number,
  system: UnitSystem,
  precision = 2,
): string => {
  if (system === "metric") return `${squareMeters.toFixed(precision)} m²`;
  const sqFt = squareMeters / (METERS_PER.ft * METERS_PER.ft);
  return `${sqFt.toFixed(precision)} ft²`;
};

export const parseLengthInput = (
  input: string,
  defaultUnit: LengthUnit,
): { meters: number } | null => {
  const trimmed = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!trimmed) return null;
  const m = trimmed.match(/^(-?\d*\.?\d+)([a-z"']*)$/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value)) return null;
  const suffix = m[2];
  let unit: LengthUnit = defaultUnit;
  if (suffix === "mm") unit = "mm";
  else if (suffix === "cm") return { meters: value * 0.01 };
  else if (suffix === "m") unit = "m";
  else if (suffix === "ft" || suffix === "'") unit = "ft";
  else if (suffix === "in" || suffix === '"') unit = "in";
  else if (suffix !== "") return null;
  return { meters: toMeters(value, unit) };
};
