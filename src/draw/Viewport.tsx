import { useEffect, useRef, useState, type ReactNode } from "react";

export type ViewportTransform = {
  /** Pan in container CSS px */
  pan: { x: number; y: number };
  /** Zoom multiplier */
  zoom: number;
  /** Container CSS size */
  size: { w: number; h: number };
  /** Cursor in container CSS px (null when not over the viewport) */
  cursor: { x: number; y: number } | null;
};

type Props = {
  contentWidth: number;
  contentHeight: number;
  /** Rendered inside the CSS-transformed wrapper (PDF canvas, etc) — gets visually scaled. */
  transformedChild: (zoom: number) => ReactNode;
  /** Rendered as a sibling overlay at full container size — receives pan/zoom and renders untransformed. */
  overlay?: (t: ViewportTransform) => ReactNode;
  onZoomChange?: (zoom: number) => void;
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 12;

export const Viewport = ({
  contentWidth,
  contentHeight,
  transformedChild,
  overlay,
  onZoomChange,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const panState = useRef<{
    panning: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const spaceHeld = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (containerSize.w === 0 || containerSize.h === 0) return;
    setPan({
      x: (containerSize.w - contentWidth * zoom) / 2,
      y: (containerSize.h - contentHeight * zoom) / 2,
    });
    // recenter only when content size or container size changes meaningfully
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentWidth, contentHeight, containerSize.w, containerSize.h]);

  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const intensity = e.ctrlKey ? 0.01 : 0.0015;
      const factor = Math.exp(-e.deltaY * intensity);
      const z = zoomRef.current;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
      const ratio = next / z;
      const p = panRef.current;
      setZoom(next);
      setPan({
        x: cx - (cx - p.x) * ratio,
        y: cy - (cy - p.y) * ratio,
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  useEffect(() => {
    const isTextInput = (el: EventTarget | null) =>
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLElement && el.isContentEditable);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTextInput(e.target)) {
        e.preventDefault();
        if (!e.repeat) {
          spaceHeld.current = true;
          document.body.style.cursor = "grab";
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTextInput(e.target)) {
        e.preventDefault();
        spaceHeld.current = false;
        document.body.style.cursor = "";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.tagName === "BUTTON") {
      active.blur();
    }
    const isPanBtn = e.button === 1 || (e.button === 0 && spaceHeld.current);
    if (!isPanBtn) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    panState.current = {
      panning: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
    document.body.style.cursor = "grabbing";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    const s = panState.current;
    if (!s?.panning) return;
    setPan({
      x: s.startPanX + (e.clientX - s.startX),
      y: s.startPanY + (e.clientY - s.startY),
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (panState.current?.panning) {
      panState.current = null;
      document.body.style.cursor = spaceHeld.current ? "grab" : "";
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    }
  };
  const onPointerLeave = () => setCursor(null);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden overscroll-none bg-slate-900"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: contentWidth,
          height: contentHeight,
        }}
      >
        {transformedChild(zoom)}
      </div>
      {overlay && (
        <div
          className="pointer-events-auto absolute inset-0"
          style={{ width: containerSize.w, height: containerSize.h }}
        >
          {overlay({ pan, zoom, size: containerSize, cursor })}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 right-3 rounded bg-slate-800/70 px-2 py-1 text-xs text-slate-300">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
};
