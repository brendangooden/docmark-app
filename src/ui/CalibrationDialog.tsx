import { useEffect, useMemo, useRef, useState } from "react";
import {
  fromMeters,
  parseLengthInput,
  toMeters,
  type LengthUnit,
  type UnitSystem,
} from "../lib/units";

type Props = {
  /** PDF-unit length of the calibration reference line */
  pdfLength: number;
  units: UnitSystem;
  /** Mode: "create" after drawing a new reference line, or "edit" with prefilled value */
  mode?: "create" | "edit";
  /** Pre-fill (real-world meters) when editing */
  initialMeters?: number | null;
  onCancel: () => void;
  onConfirm: (metersPerPdfUnit: number) => void;
};

const UNIT_CHOICES: LengthUnit[] = ["mm", "m", "ft", "in"];

const SUFFIX_RE = /[a-z"']/i;

export const CalibrationDialog = ({
  pdfLength,
  units,
  mode = "create",
  initialMeters,
  onCancel,
  onConfirm,
}: Props) => {
  const defaultUnit: LengthUnit = useMemo(() => {
    if (initialMeters != null) {
      // Pick a sensible unit for the prefilled value.
      if (units === "metric") return Math.abs(initialMeters) >= 1 ? "m" : "mm";
      return Math.abs(initialMeters) >= 0.3048 ? "ft" : "in";
    }
    return units === "metric" ? "m" : "ft";
  }, [initialMeters, units]);

  const [unit, setUnit] = useState<LengthUnit>(defaultUnit);
  const [value, setValue] = useState<string>(() => {
    if (initialMeters == null) return "";
    const v = fromMeters(initialMeters, defaultUnit);
    // Trim trailing zeros for cleanliness
    return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, "");
  });
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // When the user changes the unit dropdown, convert the displayed value.
  const onUnitChange = (next: LengthUnit) => {
    if (value.trim() && !SUFFIX_RE.test(value)) {
      const num = parseFloat(value);
      if (Number.isFinite(num)) {
        const meters = toMeters(num, unit);
        const converted = fromMeters(meters, next);
        setValue(
          Number.isInteger(converted)
            ? String(converted)
            : converted.toFixed(3).replace(/\.?0+$/, ""),
        );
      }
    }
    setUnit(next);
    setError(null);
  };

  const submit = () => {
    const parsed = parseLengthInput(value, unit);
    if (!parsed || parsed.meters <= 0) {
      setError("Enter a positive length, e.g. 5, 5000, 16'.");
      return;
    }
    if (pdfLength <= 0) {
      setError("Reference line is too short.");
      return;
    }
    onConfirm(parsed.meters / pdfLength);
  };

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-100">
          {isEdit ? "Edit scale" : "Set scale"}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {isEdit
            ? "Adjust the real-world length of the reference line."
            : "Enter the real-world length of the line you just drew."}
        </p>

        <div className="mt-3 flex gap-2">
          <input
            ref={inputRef}
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onCancel();
            }}
            placeholder="Length"
            className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
          />
          <div className="flex overflow-hidden rounded border border-slate-700">
            {UNIT_CHOICES.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onUnitChange(u)}
                onMouseDown={(e) => e.preventDefault()}
                className={
                  u === unit
                    ? "bg-cyan-500 px-2.5 py-2 text-sm font-semibold text-slate-950"
                    : "bg-slate-800 px-2.5 py-2 text-sm text-slate-300 hover:bg-slate-700"
                }
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          You can also type units inline, e.g. <code>5000 mm</code>, <code>16'</code>, <code>2.5 m</code>.
        </p>

        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            {isEdit ? "Save" : "Set scale"}
          </button>
        </div>
      </div>
    </div>
  );
};
