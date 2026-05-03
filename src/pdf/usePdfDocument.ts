import { useEffect, useState } from "react";
import "./pdfWorker";
import { getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";

export type LoadedPdf = {
  doc: PDFDocumentProxy;
  page: PDFPageProxy;
  pageWidth: number;
  pageHeight: number;
};

export const usePdfDocument = (file: File | null) => {
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPdf(null);
      return;
    }
    let cancelled = false;
    let docRef: PDFDocumentProxy | null = null;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const doc = await getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        docRef = doc;
        const page = await doc.getPage(1);
        if (cancelled) {
          doc.destroy();
          return;
        }
        // Pin "base" dims to rotation 0 so our coordinate system is independent
        // of any intrinsic page rotation embedded in the PDF.
        const vp = page.getViewport({ scale: 1, rotation: 0 });
        setPdf({ doc, page, pageWidth: vp.width, pageHeight: vp.height });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      docRef?.destroy();
    };
  }, [file]);

  return { pdf, loading, error };
};
