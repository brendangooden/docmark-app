import { useEffect, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";

type Row = { keys: string[]; description: string };
type Section = { title: string; rows: Row[] };

const SECTIONS: Section[] = [
  {
    title: "Tools",
    rows: [
      { keys: ["V"], description: "Select / drag points" },
      { keys: ["L"], description: "Distance (chained polyline)" },
      { keys: ["P"], description: "Area (closed polygon)" },
      { keys: ["R"], description: "Rectangle (drag)" },
      { keys: ["O"], description: "Ellipse (drag)" },
      { keys: ["A"], description: "Arrow (drag)" },
      { keys: ["T"], description: "Text note (click)" },
      { keys: ["C"], description: "Calibrate (set scale)" },
    ],
  },
  {
    title: "Modifiers",
    rows: [
      {
        keys: ["Shift"],
        description:
          "Snap to angle / square / circle / 45° lock — also activates the magnifier loupe",
      },
      { keys: ["Alt"], description: "Drag a selected shape to move it" },
      {
        keys: ["Space"],
        description: "Hold + drag to pan the canvas (or middle-mouse)",
      },
      { keys: ["Wheel"], description: "Zoom in / out" },
    ],
  },
  {
    title: "Selection & labels",
    rows: [
      { keys: ["Click label"], description: "Selects the parent shape" },
      {
        keys: ["Drag label"],
        description: "Reposition a suspended note (a leader line will track back to the shape)",
      },
      {
        keys: ["Dbl-click label"],
        description: "Dock a suspended note back inline",
      },
      { keys: ["Delete"], description: "Remove the selected shape" },
      { keys: ["Esc"], description: "Cancel an in-progress draft" },
      { keys: ["Enter"], description: "Finish the current polyline / polygon" },
    ],
  },
];

export const HelpPopover = () => {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (cardRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        title="Keyboard & modifier shortcuts"
        aria-label="Help"
        aria-expanded={open}
        className={[
          "fixed bottom-12 right-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition",
          open
            ? "bg-cyan-500 text-slate-950"
            : "bg-slate-800 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700",
        ].join(" ")}
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {open && (
        <div
          ref={cardRef}
          role="dialog"
          aria-label="Shortcuts"
          className="fixed bottom-24 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <h2 className="text-sm font-semibold text-slate-100">Tips & shortcuts</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close help"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
            {SECTIONS.map((s) => (
              <section key={s.title} className="mb-3 last:mb-0">
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {s.title}
                </h3>
                <ul className="space-y-1">
                  {s.rows.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="flex shrink-0 flex-wrap gap-0.5">
                        {r.keys.map((k, ki) => (
                          <kbd
                            key={ki}
                            className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-200"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                      <span className="text-slate-300">{r.description}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
