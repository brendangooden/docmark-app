import {
  useAppStore,
  type LineStyle,
  type Measurement,
} from "../state/store";
import {
  polygonArea,
  polylineLength,
  rectFromPoints,
} from "../draw/geometry";
import { formatArea, formatLength } from "../lib/units";

const PALETTE = [
  "#22d3ee",
  "#f472b6",
  "#a78bfa",
  "#facc15",
  "#34d399",
  "#fb923c",
  "#60a5fa",
  "#f87171",
];

const THICKNESS_OPTIONS = [1, 2, 3, 5, 8];
const LINE_STYLE_OPTIONS: LineStyle[] = ["solid", "dashed", "dotted"];
const FONT_SIZE_OPTIONS = [10, 12, 14, 18, 24];

const KIND_LABEL: Record<Measurement["kind"], string> = {
  polyline: "Distance",
  polygon: "Area",
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  arrow: "Arrow",
  text: "Note",
};

const closedShapeKind = (m: Measurement) =>
  m.kind === "polygon" || m.kind === "rectangle" || m.kind === "ellipse";

const distanceTotalMeters = (m: Measurement, metersPerPdfUnit: number): number => {
  const raw = polylineLength(m.points) * metersPerPdfUnit;
  const sb = m.bufferStartPercent ?? 0;
  const eb = m.bufferEndPercent ?? 0;
  return raw * (1 + (sb + eb) / 100);
};

const computeReadout = (
  m: Measurement,
  metersPerPdfUnit: number | null,
  units: "metric" | "imperial",
): string | null => {
  if (metersPerPdfUnit == null) return null;
  if (m.kind === "polyline" || m.kind === "arrow") {
    const raw = polylineLength(m.points) * metersPerPdfUnit;
    const sb = m.bufferStartPercent ?? 0;
    const eb = m.bufferEndPercent ?? 0;
    if (sb !== 0 || eb !== 0) {
      const total = raw * (1 + (sb + eb) / 100);
      return `${formatLength(raw, units)} → ${formatLength(total, units)} (+${sb}/${eb}%)`;
    }
    return formatLength(raw, units);
  }
  if (m.kind === "polygon") {
    const len = polylineLength(m.points) * metersPerPdfUnit;
    const area = polygonArea(m.points) * metersPerPdfUnit * metersPerPdfUnit;
    return `${formatLength(len, units)} · ${formatArea(area, units)}`;
  }
  if ((m.kind === "rectangle" || m.kind === "ellipse") && m.points.length >= 2) {
    const r = rectFromPoints(m.points[0], m.points[1]);
    const w = r.width * metersPerPdfUnit;
    const h = r.height * metersPerPdfUnit;
    const area =
      m.kind === "rectangle" ? w * h : Math.PI * (w / 2) * (h / 2);
    return `${formatLength(w, units)} × ${formatLength(h, units)} · ${formatArea(
      area,
      units,
    )}`;
  }
  return null;
};

export const MeasurementsPanel = () => {
  const measurements = useAppStore((s) => s.measurements);
  const selectedId = useAppStore((s) => s.selectedId);
  const setSelected = useAppStore((s) => s.setSelected);
  const updateMeasurement = useAppStore((s) => s.updateMeasurement);
  const removeMeasurement = useAppStore((s) => s.removeMeasurement);
  const clearMeasurements = useAppStore((s) => s.clearMeasurements);
  const metersPerPdfUnit = useAppStore((s) => s.metersPerPdfUnit);
  const units = useAppStore((s) => s.units);

  const totalLengthMeters =
    metersPerPdfUnit != null
      ? measurements
          .filter((m) => (m.kind === "polyline" || m.kind === "arrow") && m.visible)
          .reduce((acc, m) => acc + distanceTotalMeters(m, metersPerPdfUnit), 0)
      : null;

  return (
    <aside className="flex h-full w-80 flex-col border-l border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-200">Measurements</h2>
        {measurements.length > 0 && (
          <button
            type="button"
            onClick={clearMeasurements}
            className="text-xs text-slate-400 hover:text-rose-300"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {measurements.length === 0 && (
          <p className="p-3 text-xs text-slate-500">
            No measurements yet. Set a scale, then pick a tool from the toolbar.
          </p>
        )}
        <ul>
          {measurements.map((m) => {
            const isSel = m.id === selectedId;
            const readout = computeReadout(m, metersPerPdfUnit, units);
            return (
              <li
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={[
                  "cursor-pointer border-b border-slate-800 text-sm",
                  isSel ? "bg-slate-800/60" : "hover:bg-slate-800/40",
                ].join(" ")}
              >
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{ background: m.color }}
                    />
                    <input
                      value={m.name}
                      onChange={(e) =>
                        updateMeasurement(m.id, { name: e.target.value })
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent text-slate-100 outline-none focus:underline"
                    />
                    <button
                      type="button"
                      title={m.visible ? "Hide" : "Show"}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMeasurement(m.id, { visible: !m.visible });
                      }}
                      className="text-xs text-slate-400 hover:text-slate-100"
                    >
                      {m.visible ? "👁" : "—"}
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMeasurement(m.id);
                      }}
                      className="text-xs text-slate-400 hover:text-rose-400"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-1 pl-5 text-xs text-slate-400">
                    {KIND_LABEL[m.kind]}
                    {readout && <> · {readout}</>}
                  </div>
                </div>
                {isSel && (
                  <PropertiesEditor
                    m={m}
                    onUpdate={(patch) => updateMeasurement(m.id, patch)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {totalLengthMeters != null && totalLengthMeters > 0 && (
        <div className="border-t border-slate-800 px-3 py-2 text-xs text-slate-300">
          Combined distance:{" "}
          <span className="font-semibold text-cyan-300">
            {formatLength(totalLengthMeters, units)}
          </span>
        </div>
      )}
    </aside>
  );
};

const PropertiesEditor = ({
  m,
  onUpdate,
}: {
  m: Measurement;
  onUpdate: (patch: Partial<Measurement>) => void;
}) => {
  const isClosed = closedShapeKind(m);
  const isText = m.kind === "text";

  const inlineCenterPoint = (() => {
    if (m.points.length === 0) return { x: 0, y: 0 };
    if (m.kind === "rectangle" || m.kind === "ellipse") {
      const r = rectFromPoints(m.points[0], m.points[1]);
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    if (m.kind === "polygon") {
      const s = m.points.reduce(
        (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
        { x: 0, y: 0 },
      );
      return { x: s.x / m.points.length, y: s.y / m.points.length };
    }
    return m.points[Math.floor(m.points.length / 2)];
  })();

  return (
    <div
      className="space-y-2 border-t border-slate-800/70 bg-slate-950/40 px-3 py-2 text-xs text-slate-300"
      onClick={(e) => e.stopPropagation()}
    >
      <Field label="Color">
        <div className="flex flex-wrap items-center gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onUpdate({ color: c })}
              title={c}
              className={[
                "h-5 w-5 rounded-sm ring-offset-slate-900 transition",
                m.color === c ? "ring-2 ring-white ring-offset-1" : "",
              ].join(" ")}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={normalizeHex(m.color)}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="h-6 w-7 cursor-pointer rounded border border-slate-700 bg-slate-800"
            title="Custom colour"
          />
        </div>
      </Field>

      {!isText && (
        <Field label="Thickness">
          <div className="flex gap-1">
            {THICKNESS_OPTIONS.map((w) => (
              <button
                key={w}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onUpdate({ strokeWidth: w })}
                className={[
                  "rounded px-2 py-0.5 text-xs",
                  m.strokeWidth === w
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-800 hover:bg-slate-700",
                ].join(" ")}
              >
                {w}
              </button>
            ))}
          </div>
        </Field>
      )}

      {!isText && (
        <Field label="Line">
          <div className="flex gap-1">
            {LINE_STYLE_OPTIONS.map((ls) => (
              <button
                key={ls}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onUpdate({ lineStyle: ls })}
                className={[
                  "rounded px-2 py-0.5 text-xs capitalize",
                  m.lineStyle === ls
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-800 hover:bg-slate-700",
                ].join(" ")}
              >
                {ls}
              </button>
            ))}
          </div>
        </Field>
      )}

      {isClosed && (
        <Field label={`Fill ${Math.round(m.fillOpacity * 100)}%`}>
          <input
            type="range"
            min={0}
            max={60}
            step={1}
            value={Math.round(m.fillOpacity * 100)}
            onChange={(e) =>
              onUpdate({ fillOpacity: Number(e.target.value) / 100 })
            }
            className="w-full accent-cyan-500"
          />
        </Field>
      )}

      <Field label="Note">
        <textarea
          value={m.note ?? ""}
          onChange={(e) => onUpdate({ note: e.target.value })}
          rows={2}
          placeholder={isText ? "Type your note…" : "Optional annotation"}
          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400"
        />
      </Field>

      {!isText && (
        <Field label="Readout">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={m.showMeasurements}
              onChange={(e) => onUpdate({ showMeasurements: e.target.checked })}
              className="accent-cyan-500"
            />
            Show calculated values
          </label>
        </Field>
      )}

      {(m.kind === "polyline" || m.kind === "arrow") && (
        <Field label="Buffer %">
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1">
              <span className="text-slate-500">Start</span>
              <input
                type="number"
                step={1}
                min={-100}
                value={m.bufferStartPercent ?? 0}
                onChange={(e) =>
                  onUpdate({ bufferStartPercent: Number(e.target.value) || 0 })
                }
                className="w-14 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-slate-100 outline-none focus:border-cyan-400"
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-slate-500">End</span>
              <input
                type="number"
                step={1}
                min={-100}
                value={m.bufferEndPercent ?? 0}
                onChange={(e) =>
                  onUpdate({ bufferEndPercent: Number(e.target.value) || 0 })
                }
                className="w-14 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-slate-100 outline-none focus:border-cyan-400"
              />
            </label>
          </div>
        </Field>
      )}

      {!isText && (
        <Field label="Label">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (m.noteAnchor) {
                onUpdate({ noteAnchor: null });
              } else {
                // Suspend the label slightly offset so the leader line is visible.
                onUpdate({
                  noteAnchor: {
                    x: inlineCenterPoint.x + 60,
                    y: inlineCenterPoint.y + 60,
                  },
                });
              }
            }}
            className={[
              "rounded px-2 py-0.5 text-xs",
              m.noteAnchor
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-800 hover:bg-slate-700",
            ].join(" ")}
          >
            {m.noteAnchor ? "Suspended (drag label, dbl-click to dock)" : "Suspend label"}
          </button>
        </Field>
      )}

      {isText && (
        <Field label="Font size">
          <div className="flex gap-1">
            {FONT_SIZE_OPTIONS.map((fs) => (
              <button
                key={fs}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onUpdate({ fontSize: fs })}
                className={[
                  "rounded px-2 py-0.5 text-xs",
                  (m.fontSize ?? 14) === fs
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-800 hover:bg-slate-700",
                ].join(" ")}
              >
                {fs}
              </button>
            ))}
          </div>
        </Field>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-2">
    <span className="w-16 shrink-0 pt-0.5 text-[11px] uppercase tracking-wide text-slate-500">
      {label}
    </span>
    <div className="flex-1">{children}</div>
  </div>
);

const normalizeHex = (color: string): string => {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{8}$/.test(color)) return color.slice(0, 7);
  return "#22d3ee";
};
