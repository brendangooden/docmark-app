import { useEffect, useState } from "react";
import { loadPdfDocument } from "./pdfAdapter";
import { loadImageDocument } from "./imageAdapter";
import type { DocumentKind, LoadedDocument } from "./types";

const isPdf = (f: File) =>
  f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isImage = (f: File) =>
  f.type === "image/jpeg" ||
  f.type === "image/png" ||
  /\.(jpe?g|png)$/i.test(f.name);

const detectKind = (f: File): DocumentKind | null => {
  if (isPdf(f)) return "pdf";
  if (isImage(f)) return "image";
  return null;
};

export const useDocument = (file: File | null) => {
  const [doc, setDoc] = useState<LoadedDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setDoc(null);
      return;
    }
    let cancelled = false;
    let loaded: LoadedDocument | null = null;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const kind = detectKind(file);
        if (!kind) throw new Error("Unsupported file type. Use PDF, JPG, or PNG.");
        loaded =
          kind === "pdf"
            ? await loadPdfDocument(file)
            : await loadImageDocument(file);
        if (cancelled) {
          loaded.page.destroy();
          return;
        }
        setDoc(loaded);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      loaded?.page.destroy();
    };
  }, [file]);

  return { doc, loading, error };
};
