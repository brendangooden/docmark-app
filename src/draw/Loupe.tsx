import { useEffect, useRef } from "react";

type Props = {
  /** Source PDF canvas to magnify */
  sourceCanvas: HTMLCanvasElement | null;
  /** Cursor position in container CSS px (null = hidden) */
  cursor: { x: number; y: number } | null;
  /** Container size in CSS px */
  containerSize: { w: number; h: number };
  /** Pan/zoom of the surrounding viewport */
  pan: { x: number; y: number };
  zoom: number;
  /** PDF canvas CSS dims (display-rotated, includes fitScale) */
  pdfCssWidth: number;
  pdfCssHeight: number;
  /** Magnification on top of current screen zoom */
  magnification?: number;
  /** Loupe diameter in CSS px */
  size?: number;
  /** Pixel offset from cursor (in CSS px) */
  offset?: number;
};

export const Loupe = ({
  sourceCanvas,
  cursor,
  containerSize,
  pan,
  zoom,
  pdfCssWidth,
  pdfCssHeight,
  magnification = 2,
  size = 140,
  offset = 24,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dst = canvasRef.current;
    if (!dst || !sourceCanvas || !cursor) return;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.round(size * dpr);
    if (dst.width !== px || dst.height !== px) {
      dst.width = px;
      dst.height = px;
    }
    const ctx = dst.getContext("2d");
    if (!ctx) return;

    // Cursor in PDF-canvas CSS-coords (zoom=1 reference)
    const cssCoordX = (cursor.x - pan.x) / zoom;
    const cssCoordY = (cursor.y - pan.y) / zoom;

    // Source-canvas-pixel ratio: source canvas was rendered at higher resolution
    const ratioX = sourceCanvas.width / pdfCssWidth;
    const ratioY = sourceCanvas.height / pdfCssHeight;

    // Magnified source region (in source canvas pixels)
    const srcW = (size / (magnification * zoom)) * ratioX;
    const srcH = (size / (magnification * zoom)) * ratioY;
    const sx = cssCoordX * ratioX - srcW / 2;
    const sy = cssCoordY * ratioY - srcH / 2;

    ctx.save();
    ctx.clearRect(0, 0, px, px);
    // Solid PDF-paper backdrop in case the source region falls partly outside
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, px, px);

    // Clip to circle so the canvas content is masked
    ctx.beginPath();
    ctx.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2);
    ctx.clip();

    // Pixelate carefully — use smoothing for the magnified PDF (it's not pixel art)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    try {
      ctx.drawImage(sourceCanvas, sx, sy, srcW, srcH, 0, 0, px, px);
    } catch {
      /* ignore — happens if sx/sy are NaN before first render */
    }

    // Crosshairs (in dst pixel space)
    const center = px / 2;
    const arm = px / 2 - 4 * dpr;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    ctx.moveTo(center - arm, center);
    ctx.lineTo(center - 4 * dpr, center);
    ctx.moveTo(center + 4 * dpr, center);
    ctx.lineTo(center + arm, center);
    ctx.moveTo(center, center - arm);
    ctx.lineTo(center, center - 4 * dpr);
    ctx.moveTo(center, center + 4 * dpr);
    ctx.lineTo(center, center + arm);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = "rgba(34, 211, 238, 0.95)";
    ctx.beginPath();
    ctx.arc(center, center, 2 * dpr, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [
    sourceCanvas,
    cursor,
    pan.x,
    pan.y,
    zoom,
    pdfCssWidth,
    pdfCssHeight,
    magnification,
    size,
  ]);

  if (!cursor) return null;

  // Place the loupe near the cursor, flipping when near container edges
  const half = size / 2 + 4;
  let lx = cursor.x + offset;
  let ly = cursor.y + offset;
  if (lx + size + 8 > containerSize.w) lx = cursor.x - offset - size;
  if (ly + size + 8 > containerSize.h) ly = cursor.y - offset - size;
  // Stay on-screen
  lx = Math.max(8, Math.min(lx, containerSize.w - size - 8));
  ly = Math.max(8, Math.min(ly, containerSize.h - size - 8));
  void half;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: lx,
        top: ly,
        width: size,
        height: size,
        borderRadius: "9999px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.45), 0 0 0 2px rgba(15,23,42,0.85), 0 0 0 3px rgba(34,211,238,0.7)",
        background: "#fff",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          display: "block",
          borderRadius: "9999px",
        }}
      />
    </div>
  );
};
