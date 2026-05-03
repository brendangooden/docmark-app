import { useState } from "react";
import type { DocumentPage } from "../document/types";
import { useAppStore } from "../state/store";
import { buildExportJson, downloadJson } from "../export/exportJson";
import { exportPdf, exportPng } from "../export/exportImage";

type Props = {
  page: DocumentPage;
  pageWidth: number;
  pageHeight: number;
  baseName: string;
};

export const ExportMenu = ({ page, pageWidth, pageHeight, baseName }: Props) => {
  const measurements = useAppStore((s) => s.measurements);
  const metersPerPdfUnit = useAppStore((s) => s.metersPerPdfUnit);
  const units = useAppStore((s) => s.units);
  const showLabels = useAppStore((s) => s.showLabels);
  const rotation = useAppStore((s) => s.rotation);
  const pdfMeta = useAppStore((s) => s.pdf);
  const [busy, setBusy] = useState<null | "png" | "pdf" | "json">(null);

  const disabled = measurements.length === 0;

  const wrap = async (kind: "png" | "pdf" | "json", fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      alert(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled || busy !== null}
        onClick={() =>
          wrap("png", () =>
            exportPng(
              { page, pageWidth, pageHeight, rotation, measurements, metersPerPdfUnit, units, showLabels },
              baseName,
            ),
          )
        }
        className="rounded bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
      >
        {busy === "png" ? "…" : "PNG"}
      </button>
      <button
        type="button"
        disabled={disabled || busy !== null}
        onClick={() =>
          wrap("pdf", () =>
            exportPdf(
              { page, pageWidth, pageHeight, rotation, measurements, metersPerPdfUnit, units, showLabels },
              baseName,
            ),
          )
        }
        className="rounded bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
      >
        {busy === "pdf" ? "…" : "PDF"}
      </button>
      <button
        type="button"
        disabled={disabled || busy !== null}
        onClick={() =>
          wrap("json", async () => {
            downloadJson(
              buildExportJson(measurements, metersPerPdfUnit, pdfMeta),
              baseName,
            );
          })
        }
        className="rounded bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
      >
        JSON
      </button>
    </div>
  );
};
