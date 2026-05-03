import type { Measurement } from "../state/store";
import { polygonArea, polylineLength } from "../draw/geometry";

export type MeasurementsExport = {
  fileName: string | null;
  pageWidth: number;
  pageHeight: number;
  metersPerPdfUnit: number | null;
  exportedAt: string;
  measurements: Array<{
    id: string;
    name: string;
    kind: Measurement["kind"];
    color: string;
    points: { x: number; y: number }[];
    lengthMeters: number | null;
    areaSquareMeters: number | null;
  }>;
};

export const buildExportJson = (
  measurements: Measurement[],
  metersPerPdfUnit: number | null,
  pdf: { fileName: string; pageWidth: number; pageHeight: number } | null,
): MeasurementsExport => ({
  fileName: pdf?.fileName ?? null,
  pageWidth: pdf?.pageWidth ?? 0,
  pageHeight: pdf?.pageHeight ?? 0,
  metersPerPdfUnit,
  exportedAt: new Date().toISOString(),
  measurements: measurements.map((m) => {
    const lengthPdf = polylineLength(m.points);
    const areaPdf = m.kind === "polygon" ? polygonArea(m.points) : 0;
    return {
      id: m.id,
      name: m.name,
      kind: m.kind,
      color: m.color,
      points: m.points,
      lengthMeters: metersPerPdfUnit != null ? lengthPdf * metersPerPdfUnit : null,
      areaSquareMeters:
        metersPerPdfUnit != null && m.kind === "polygon"
          ? areaPdf * metersPerPdfUnit * metersPerPdfUnit
          : null,
    };
  }),
});

export const downloadJson = (data: MeasurementsExport, baseName: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, `${baseName}.measurements.json`);
};

export const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
