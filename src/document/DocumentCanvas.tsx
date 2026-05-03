import { useEffect, useRef } from "react";
import type { DocumentPage } from "./types";
import type { Rotation } from "../draw/rotation";

type Props = {
  page: DocumentPage;
  /** Base (unrotated) page dims */
  pageWidth: number;
  pageHeight: number;
  /** CSS-px scale factor that maps base PDF/image units to screen at zoom=1 */
  fitScale: number;
  rotation: Rotation;
  /** Effective zoom level for resolution boost (debounced upstream) */
  renderZoom: number;
  /** Optional callback invoked with the underlying canvas element (for the loupe). */
  onCanvasRef?: (el: HTMLCanvasElement | null) => void;
};

const MAX_RENDER_ZOOM = 4;

export const DocumentCanvas = ({
  page,
  pageWidth,
  pageHeight,
  fitScale,
  rotation,
  renderZoom,
  onCanvasRef,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    const rotated = rotation === 90 || rotation === 270;
    const cssW = (rotated ? pageHeight : pageWidth) * fitScale;
    const cssH = (rotated ? pageWidth : pageHeight) * fitScale;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    page
      .render({ ctx, scale: renderScale, rotation })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err as { name?: string };
        if (e?.name !== "RenderingCancelledException") console.error(err);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageWidth, pageHeight, fitScale, rotation, renderZoom]);

  return (
    <canvas
      ref={setCanvas}
      className="block bg-white shadow-2xl"
      style={{ pointerEvents: "none" }}
    />
  );
};
