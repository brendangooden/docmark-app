import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileDrop } from "./ui/FileDrop";
import { Toolbar } from "./ui/Toolbar";
import { MeasurementsPanel } from "./ui/MeasurementsPanel";
import { CalibrationDialog } from "./ui/CalibrationDialog";
import { ExportMenu } from "./ui/ExportMenu";
import { GitHubBadge } from "./ui/GitHubBadge";
import { HelpPopover } from "./ui/HelpPopover";
import { Viewport } from "./draw/Viewport";
import { DocumentCanvas } from "./document/DocumentCanvas";
import { MeasureStage } from "./draw/MeasureStage";
import { Loupe } from "./draw/Loupe";
import { displayDims } from "./draw/rotation";
import { useDocument } from "./document/useDocument";
import { useAppStore } from "./state/store";

const RENDER_ZOOM_DEBOUNCE_MS = 180;

const App = () => {
  const [file, setFile] = useState<File | null>(null);
  const [container, setContainer] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [pendingCalibration, setPendingCalibration] = useState<number | null>(null);
  const [editingScale, setEditingScale] = useState(false);
  const [renderZoom, setRenderZoom] = useState(1);
  const [pdfCanvasEl, setPdfCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const stageHostRef = useRef<HTMLDivElement | null>(null);
  const renderZoomTimer = useRef<number | null>(null);

  const pdfMeta = useAppStore((s) => s.pdf);
  const setPdfMeta = useAppStore((s) => s.setPdfMeta);
  const clearPdf = useAppStore((s) => s.clearPdf);
  const setCalibration = useAppStore((s) => s.setCalibration);
  const setScaleMeters = useAppStore((s) => s.setScaleMeters);
  const setTool = useAppStore((s) => s.setTool);
  const tool = useAppStore((s) => s.tool);
  const units = useAppStore((s) => s.units);
  const rotation = useAppStore((s) => s.rotation);
  const metersPerPdfUnit = useAppStore((s) => s.metersPerPdfUnit);
  const calibrationPdfLength = useAppStore((s) => s.calibrationPdfLength);

  const { doc, loading, error } = useDocument(file);

  // Update store with file meta when document loads
  useEffect(() => {
    if (doc && file) {
      setPdfMeta({
        fileName: file.name,
        pageWidth: doc.pageWidth,
        pageHeight: doc.pageHeight,
        documentKind: doc.kind,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, file]);

  // Track viewport container size for fitScale
  useEffect(() => {
    const el = stageHostRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainer({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  // Display dims after rotation
  const displayDim = useMemo(() => {
    if (!doc) return { width: 0, height: 0 };
    return displayDims(doc.pageWidth, doc.pageHeight, rotation);
  }, [doc, rotation]);

  const fitScale = useMemo(() => {
    if (!doc) return 1;
    if (container.w === 0 || container.h === 0) return 1;
    const margin = 40;
    return Math.min(
      (container.w - margin) / displayDim.width,
      (container.h - margin) / displayDim.height,
    );
  }, [doc, container.w, container.h, displayDim.width, displayDim.height]);

  // Debounced re-render of PDF at higher resolution when zoomed in
  const handleZoomChange = useCallback((z: number) => {
    if (renderZoomTimer.current != null) window.clearTimeout(renderZoomTimer.current);
    renderZoomTimer.current = window.setTimeout(() => {
      setRenderZoom(z);
    }, RENDER_ZOOM_DEBOUNCE_MS);
  }, []);

  // Keyboard shortcuts for tools
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "v") setTool("select");
      else if (k === "l") setTool("polyline");
      else if (k === "p") setTool("polygon");
      else if (k === "r") setTool("rectangle");
      else if (k === "o") setTool("ellipse");
      else if (k === "a") setTool("arrow");
      else if (k === "t") setTool("text");
      else if (k === "c") setTool("calibrate");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTool]);

  // Track Shift for loupe gating
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    const onBlur = () => setShiftHeld(false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const onFile = useCallback(
    (f: File) => {
      if (pdfMeta && pdfMeta.fileName !== f.name) {
        clearPdf();
      }
      setFile(f);
    },
    [pdfMeta, clearPdf],
  );

  const handleCalibrationDrawn = useCallback((pdfLength: number) => {
    setPendingCalibration(pdfLength);
  }, []);

  const baseName = useMemo(() => {
    const n = file?.name ?? pdfMeta?.fileName ?? "docmark";
    return n.replace(/\.pdf$/i, "");
  }, [file, pdfMeta]);

  const restoreHint = pdfMeta && !file
    ? `Last session: ${pdfMeta.fileName} — re-upload the same file to restore measurements.`
    : null;

  const contentW = displayDim.width * fitScale;
  const contentH = displayDim.height * fitScale;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-cyan-500 font-black text-slate-950">D</div>
          <div>
            <h1 className="text-base font-semibold leading-tight">DocMark</h1>
            <p className="text-[11px] leading-tight text-slate-400">Measure & mark up documents · in-browser</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {doc && (
            <ExportMenu
              page={doc.page}
              pageWidth={doc.pageWidth}
              pageHeight={doc.pageHeight}
              baseName={baseName}
            />
          )}
          {file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                clearPdf();
              }}
              className="rounded px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              Close
            </button>
          )}
          <span className="hidden h-6 w-px bg-slate-800 sm:block" />
          <GitHubBadge />
        </div>
      </header>

      {doc && <Toolbar onEditScale={() => setEditingScale(true)} />}

      <div className="flex flex-1 overflow-hidden">
        <main ref={stageHostRef} className="relative flex-1">
          {!file && (
            <div className="flex h-full w-full items-center justify-center p-6">
              <FileDrop onFile={onFile} hint={restoreHint} />
            </div>
          )}
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Loading…
            </div>
          )}
          {error && (
            <div className="flex h-full items-center justify-center text-sm text-rose-400">
              Failed to load file: {error}
            </div>
          )}
          {doc && (
            <Viewport
              contentWidth={contentW}
              contentHeight={contentH}
              onZoomChange={handleZoomChange}
              transformedChild={() => (
                <DocumentCanvas
                  page={doc.page}
                  pageWidth={doc.pageWidth}
                  pageHeight={doc.pageHeight}
                  fitScale={fitScale}
                  rotation={rotation}
                  renderZoom={renderZoom}
                  onCanvasRef={setPdfCanvasEl}
                />
              )}
              overlay={({ pan, zoom, size, cursor }) => (
                <>
                  <MeasureStage
                    pageWidth={doc.pageWidth}
                    pageHeight={doc.pageHeight}
                    rotation={rotation}
                    fitScale={fitScale}
                    zoom={zoom}
                    pan={pan}
                    containerWidth={size.w}
                    containerHeight={size.h}
                    onCalibrationDrawn={handleCalibrationDrawn}
                  />
                  {(tool === "calibrate" ||
                    ((tool === "polyline" ||
                      tool === "polygon" ||
                      tool === "rectangle" ||
                      tool === "ellipse" ||
                      tool === "arrow") &&
                      shiftHeld)) && (
                    <Loupe
                      sourceCanvas={pdfCanvasEl}
                      cursor={cursor}
                      containerSize={size}
                      pan={pan}
                      zoom={zoom}
                      pdfCssWidth={contentW}
                      pdfCssHeight={contentH}
                    />
                  )}
                </>
              )}
            />
          )}
          {doc && tool === "calibrate" && pendingCalibration === null && (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded bg-amber-500/90 px-3 py-1 text-xs font-semibold text-slate-950 shadow">
              Draw a line on a known dimension, then press Enter
            </div>
          )}
        </main>
        {doc && <MeasurementsPanel />}
      </div>

      {pendingCalibration !== null && (
        <CalibrationDialog
          mode="create"
          pdfLength={pendingCalibration}
          units={units}
          onCancel={() => {
            setPendingCalibration(null);
            setTool("select");
          }}
          onConfirm={(mppu) => {
            setCalibration(mppu, pendingCalibration);
            setPendingCalibration(null);
            setTool("polyline");
          }}
        />
      )}
      {editingScale &&
        calibrationPdfLength != null &&
        metersPerPdfUnit != null && (
          <CalibrationDialog
            mode="edit"
            pdfLength={calibrationPdfLength}
            initialMeters={metersPerPdfUnit * calibrationPdfLength}
            units={units}
            onCancel={() => setEditingScale(false)}
            onConfirm={(mppu) => {
              // Setter is recomputed-from-meters, but we already have mppu — apply directly.
              setScaleMeters(mppu * calibrationPdfLength);
              setEditingScale(false);
            }}
          />
        )}
      <HelpPopover />
    </div>
  );
};

export default App;
