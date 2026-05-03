import {
  ArrowUpRight,
  Circle,
  Crosshair,
  MousePointer2,
  MoveUpRight,
  Pencil,
  Pentagon,
  RotateCcw,
  RotateCw,
  Ruler,
  Square,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAppStore, type ToolMode } from "../state/store";
import { formatLength } from "../lib/units";

void ArrowUpRight; // (kept import in case we want it later)

type ToolbarProps = {
  onEditScale: () => void;
};

type ToolGroup = "select" | "measure" | "markup" | "calibrate";
type ToolDef = {
  id: ToolMode;
  label: string;
  key: string;
  hint: string;
  group: ToolGroup;
  icon: LucideIcon;
  needsScale?: boolean;
};

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", key: "V", hint: "Select / drag points", group: "select", icon: MousePointer2 },
  { id: "polyline", label: "Distance", key: "L", hint: "Chained line — click to add, double-click to finish", group: "measure", icon: Ruler, needsScale: true },
  { id: "polygon", label: "Area", key: "P", hint: "Closed polygon — double-click to close", group: "measure", icon: Pentagon, needsScale: true },
  { id: "rectangle", label: "Rect", key: "R", hint: "Drag to draw a rectangle (Shift = square)", group: "markup", icon: Square, needsScale: true },
  { id: "ellipse", label: "Ellipse", key: "O", hint: "Drag to draw an ellipse (Shift = circle)", group: "markup", icon: Circle, needsScale: true },
  { id: "arrow", label: "Arrow", key: "A", hint: "Drag to draw an arrow (Shift = 45° lock)", group: "markup", icon: MoveUpRight },
  { id: "text", label: "Text", key: "T", hint: "Click to drop a text note", group: "markup", icon: Type },
  { id: "calibrate", label: "Calibrate", key: "C", hint: "Draw a line of known length", group: "calibrate", icon: Crosshair },
];

const GROUPS: ToolGroup[] = ["select", "measure", "markup", "calibrate"];

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
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 bg-slate-900 px-2 py-2">
      {GROUPS.map((g, gi) => (
        <ToolGroupRow
          key={g}
          showDivider={gi > 0}
          tools={TOOLS.filter((t) => t.group === g)}
          tool={tool}
          hasScale={hasScale}
          setTool={setTool}
        />
      ))}
      <div className="ml-2 flex items-center gap-2">
        {hasScale ? (
          <ScaleChip
            referenceMeters={referenceMeters}
            units={units}
            onEditScale={onEditScale}
            canEdit={calibrationPdfLength != null}
            onClear={resetScale}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded bg-amber-500/15 px-2 py-1 text-xs text-amber-300 ring-1 ring-amber-500/30">
            <Pencil className="h-3 w-3" /> Calibrate first to start measuring
          </span>
        )}
      </div>
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

const ToolGroupRow = ({
  showDivider,
  tools,
  tool,
  hasScale,
  setTool,
}: {
  showDivider: boolean;
  tools: ToolDef[];
  tool: ToolMode;
  hasScale: boolean;
  setTool: (t: ToolMode) => void;
}) => (
  <>
    {showDivider && <span className="mx-1 h-6 w-px bg-slate-700" />}
    <div className="flex items-center gap-1">
      {tools.map((t) => {
        const disabled = !hasScale && !!t.needsScale;
        const Icon = t.icon;
        const isActive = tool === t.id;
        // Calibrate gets primary cyan + pulse when scale isn't set yet.
        const calibrateCta = t.id === "calibrate" && !hasScale && !isActive;
        const cls = [
          "inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition",
          isActive
            ? "bg-cyan-500 text-slate-950 shadow"
            : calibrateCta
              ? "bg-cyan-500 text-slate-950 shadow ring-2 ring-cyan-400/40 animate-pulse"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700",
          disabled ? "cursor-not-allowed opacity-40 hover:bg-slate-800" : "",
        ].join(" ");
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
            title={`${t.hint} (${t.key})`}
            className={cls}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="ml-0.5 text-[10px] uppercase opacity-60">{t.key}</span>
          </button>
        );
      })}
    </div>
  </>
);

const ScaleChip = ({
  referenceMeters,
  units,
  onEditScale,
  canEdit,
  onClear,
}: {
  referenceMeters: number | null;
  units: "metric" | "imperial";
  onEditScale: () => void;
  canEdit: boolean;
  onClear: () => void;
}) => (
  <span className="inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200 ring-1 ring-emerald-500/30">
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
    <span>
      Scale{" "}
      {referenceMeters != null ? (
        <span className="font-semibold text-emerald-100">
          {formatLength(referenceMeters, units)}
        </span>
      ) : (
        <span className="font-semibold text-emerald-100">set</span>
      )}
    </span>
    {canEdit && (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onEditScale}
        className="rounded px-1 py-0.5 text-emerald-200 hover:bg-emerald-500/15 hover:text-white"
      >
        Edit
      </button>
    )}
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClear}
      title="Clear scale"
      className="rounded p-0.5 text-emerald-200/70 hover:bg-emerald-500/15 hover:text-white"
    >
      <X className="h-3 w-3" />
    </button>
  </span>
);

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
        className="rounded bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
      >
        <RotateCcw className="h-3.5 w-3.5" />
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
        className="rounded bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
      >
        <RotateCw className="h-3.5 w-3.5" />
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
