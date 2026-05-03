import "../pdf/pdfWorker";
import { getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";
import type { DocumentPage, LoadedDocument } from "./types";
import type { Rotation } from "../draw/rotation";

export const loadPdfDocument = async (file: File): Promise<LoadedDocument> => {
  const buf = await file.arrayBuffer();
  const doc = await getDocument({ data: new Uint8Array(buf) }).promise;
  let destroyed = false;
  let page: PDFPageProxy;
  try {
    page = await doc.getPage(1);
  } catch (err) {
    doc.destroy();
    throw err;
  }
  const baseVp = page.getViewport({ scale: 1, rotation: 0 });
  const documentPage: DocumentPage = {
    width: baseVp.width,
    height: baseVp.height,
    getViewport: ({ scale, rotation }) => {
      const vp = page.getViewport({ scale, rotation });
      return { width: vp.width, height: vp.height };
    },
    render: async ({ ctx, scale, rotation }) => {
      const vp = page.getViewport({ scale, rotation });
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      destroyDoc(doc);
    },
  };
  void rotationTypeReference;
  return {
    kind: "pdf",
    page: documentPage,
    pageWidth: baseVp.width,
    pageHeight: baseVp.height,
  };
};

const destroyDoc = (doc: PDFDocumentProxy) => {
  try {
    doc.destroy();
  } catch {
    /* ignore */
  }
};

// Tiny static reference so the Rotation type stays imported for documentation;
// the value isn't used at runtime.
const rotationTypeReference: Rotation = 0;
