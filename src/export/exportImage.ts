import { jsPDF } from "jspdf";
import {
  renderComposite,
  exportPageDims,
  type CompositeOptions,
} from "./renderComposite";
import { triggerDownload } from "./exportJson";

export const exportPng = async (opts: CompositeOptions, baseName: string) => {
  const canvas = await renderComposite(opts);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Failed to encode PNG");
  triggerDownload(blob, `${baseName}.annotated.png`);
};

export const exportPdf = async (opts: CompositeOptions, baseName: string) => {
  const canvas = await renderComposite({ ...opts, scale: 2 });
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const dims = exportPageDims(opts.pageWidth, opts.pageHeight, opts.rotation);
  const orientation = dims.width > dims.height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "pt",
    format: [dims.width, dims.height],
  });
  pdf.addImage(dataUrl, "JPEG", 0, 0, dims.width, dims.height);
  pdf.save(`${baseName}.annotated.pdf`);
};
