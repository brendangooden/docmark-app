import { useAppStore, type ToolMode } from "../state/store";
import { formatLength } from "../lib/units";

type ToolbarProps = {
  onEditScale: () => void;
};

type ToolDef = {
  id: ToolMode;
  label: string;
  key: string;
  hint: string;
  needsScale?: boolean;
};

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", key: "V", hint: "Select / drag points" },
  { id: "polyline", label: "Distance", key: "L", hint: "Chained line — click to add, double-click to finish", needsScale: true },
  { id: "polygon", label: "Area", key: "P", hint: "Closed polygon — double-click to close", needsScale: true },
  { id: "rectangle", label: "Rect", key: "R", hint: "Drag to draw a rectangle (Shift = square)", needsScale: true },
  { id: "ellipse", label: "Ellipse", key: "O", hint: "Drag to draw an ellipse (Shift = circle)", needsScale: true },
  { id: "arrow", label: "Arrow", key: "A", hint: "Drag to draw an arrow (Shift = 45° lock)" },
  { id: "text", label: "Text", key: "T", hint: "Click to drop a text note" },
  { id: "calibrate", label: "Calibrate", key: "C", hint: "Draw a line of known length" },
];

export const Toolbar = ({ onEditScale }: ToolbarProps) => {
  const tool = useAppStore((s) => s.tool);
  const setTool = useAppStore((s) => s.setTool);
  const metersPerPdfUnit = useAppStore((s) => s.metersPerPdfUnit);
  const calibrationPdfLength = useAppStore((s) => s.calibrationPdfLength);
  const resetScale = useAppStore((s) => s.resetScale);
  const showLabels = useAppStore((s) => s.showLabels);
  const toggleLabels = useAppStore((s) => s.toggleLabels);
  const units = useAppStore((s) => s.units);

  const hasScale = metersPerPdfUnit != null;
  const referenceMeters =
    metersPerPdfUnit != null && calibrationPdfLength != null
      ? metersPerPdfUnit * calibrationPdfLength
      : null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900 p-2">
      {TOOLS.map((t) => {
        const disabled = !hasScale && !!t.needsScale;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
            title={`${t.hint} (${t.key})`}
            className={[
              "rounded px-2.5 py-1.5 text-sm font-medium transition",
              tool === t.id
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700",
              disabled ? "cursor-not-allowed opacity-40" : "",
            ].join(" ")}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] uppercase opacity-60">{t.key}</span>
          </button>
        );
      })}
      <div className="mx-2 h-6 w-px bg-slate-700" />
      <span className="text-xs text-slate-400">
        {hasScale ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>
              Scale:{" "}
              {referenceMeters != null ? (
                <span className="font-medium text-slate-200">
                  {formatLength(referenceMeters, units)}
                </span>
              ) : (
                <span className="font-medium text-slate-200">set</span>
              )}
              {referenceMeters != null && (
                <span className="text-slate-500"> / reference line</span>
              )}
            </span>
            {calibrationPdfLength != null && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onEditScale}
                className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200 hover:bg-slate-700"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className="rounded px-1.5 py-0.5 text-slate-400 underline hover:text-white"
              onClick={resetScale}
            >
              clear
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Set scale to start measuring
          </span>
        )}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <RotateControls />
        <label className="flex items-center gap-1 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={toggleLabels}
            className="accent-cyan-500"
          />
          Labels
        </label>
        <UnitsToggle />
      </div>
    </div>
  );
};

const RotateControls = () => {
  const rotation = useAppStore((s) => s.rotation);
  const rotateBy = useAppStore((s) => s.rotateBy);
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          rotateBy(-90);
          e.currentTarget.blur();
        }}
        title="Rotate 90° counter-clockwise"
        className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
      >
        ↺
      </button>
      <span className="w-9 text-center text-[11px] tabular-nums text-slate-400">
        {rotation}°
      </span>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          rotateBy(90);
          e.currentTarget.blur();
        }}
        title="Rotate 90° clockwise"
        className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
      >
        ↻
      </button>
    </div>
  );
};

const UnitsToggle = () => {
  const units = useAppStore((s) => s.units);
  const setUnits = useAppStore((s) => s.setUnits);
  return (
    <div className="flex overflow-hidden rounded border border-slate-700 text-xs">
      {(["metric", "imperial"] as const).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => setUnits(u)}
          className={
            units === u
              ? "bg-cyan-500 px-2 py-1 text-slate-950"
              : "bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700"
          }
        >
          {u === "metric" ? "mm/m" : "ft/in"}
        </button>
      ))}
    </div>
  );
};
