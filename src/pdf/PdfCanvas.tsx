import { useEffect, useRef } from "react";
import type { PDFPageProxy } from "pdfjs-dist";
import type { Rotation } from "../draw/rotation";

type Props = {
  page: PDFPageProxy;
  /** Base (unrotated) page dims */
  pageWidth: number;
  pageHeight: number;
  /** CSS-px scale factor that maps base PDF units to screen at zoom=1 */
  fitScale: number;
  /** Rotation applied to the page */
  rotation: Rotation;
  /** Effective zoom level for resolution boost (debounced upstream) */
  renderZoom: number;
  /** Optional callback invoked with the underlying canvas element (for the loupe). */
  onCanvasRef?: (el: HTMLCanvasElement | null) => void;
};

const MAX_RENDER_ZOOM = 4;

export const PdfCanvas = ({
  page,
  pageWidth,
  pageHeight,
  fitScale,
  rotation,
  renderZoom,
  onCanvasRef,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const setCanvas = (el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    onCanvasRef?.(el);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const zoomBoost = Math.min(MAX_RENDER_ZOOM, Math.max(1, renderZoom));
    const renderScale = fitScale * dpr * zoomBoost;
    const vp = page.getViewport({ scale: renderScale, rotation });

    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    // CSS size — same as the viewport's content frame at zoom=1 in display coords
    const rotated = rotation === 90 || rotation === 270;
    const cssW = (rotated ? pageHeight : pageWidth) * fitScale;
    const cssH = (rotated ? pageWidth : pageHeight) * fitScale;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderTaskRef.current?.cancel();
    const task = page.render({ canvasContext: ctx, viewport: vp });
    renderTaskRef.current = task;
    task.promise.catch((err: unknown) => {
      const e = err as { name?: string };
      if (e?.name !== "RenderingCancelledException") console.error(err);
    });
    return () => task.cancel();
  }, [page, pageWidth, pageHeight, fitScale, rotation, renderZoom]);

  return (
    <canvas
      ref={setCanvas}
      className="block bg-white shadow-2xl"
      style={{ pointerEvents: "none" }}
    />
  );
};
