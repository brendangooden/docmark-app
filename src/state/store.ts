import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Point } from "../draw/geometry";
import { normalizeRotation, type Rotation } from "../draw/rotation";
import type { DocumentKind } from "../document/types";
import type { UnitSystem } from "../lib/units";

export type ToolMode =
  | "select"
  | "polyline"
  | "polygon"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "text"
  | "calibrate";

export type LineStyle = "solid" | "dashed" | "dotted";

export type MeasurementKind =
  | "polyline"
  | "polygon"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "text";

export type Measurement = {
  id: string;
  name: string;
  kind: MeasurementKind;
  points: Point[];
  color: string;
  visible: boolean;
  /** When false, hide the auto-readout (name + length/area/W×H). Note is still shown. */
  showMeasurements: boolean;
  strokeWidth: number;
  lineStyle: LineStyle;
  fillOpacity: number;
  note?: string;
  noteAnchor?: Point | null;
  fontSize?: number;
  /** % of raw length added at the start (waste/overlap allowance). Distance/arrow only. */
  bufferStartPercent?: number;
  /** % of raw length added at the end. Distance/arrow only. */
  bufferEndPercent?: number;
};

export type PdfMeta = {
  fileName: string;
  pageWidth: number;
  pageHeight: number;
  documentKind: DocumentKind;
} | null;

type State = {
  pdf: PdfMeta;
  metersPerPdfUnit: number | null;
  calibrationPdfLength: number | null;
  measurements: Measurement[];
  selectedId: string | null;
  tool: ToolMode;
  units: UnitSystem;
  showLabels: boolean;
  rotation: Rotation;
};

type Actions = {
  setPdfMeta: (meta: PdfMeta) => void;
  clearPdf: () => void;
  setCalibration: (metersPerPdfUnit: number, pdfLength: number) => void;
  setScaleMeters: (meters: number) => void;
  resetScale: () => void;
  setTool: (tool: ToolMode) => void;
  setUnits: (u: UnitSystem) => void;
  toggleLabels: () => void;
  rotateBy: (deg: number) => void;
  resetRotation: () => void;
  addMeasurement: (m: Omit<Measurement, "id">) => string;
  updateMeasurement: (id: string, patch: Partial<Measurement>) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;
  setSelected: (id: string | null) => void;
  resetAll: () => void;
};

const PALETTE = [
  "#22d3ee",
  "#f472b6",
  "#a78bfa",
  "#facc15",
  "#34d399",
  "#fb923c",
  "#60a5fa",
  "#f87171",
];

export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_LINE_STYLE: LineStyle = "solid";
export const DEFAULT_FILL_OPACITY = 0.13;
export const DEFAULT_TEXT_FONT_SIZE = 14;

const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)) as string;

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      pdf: null,
      metersPerPdfUnit: null,
      calibrationPdfLength: null,
      measurements: [],
      selectedId: null,
      tool: "select",
      units: "metric",
      showLabels: true,
      rotation: 0,

      setPdfMeta: (meta) => set({ pdf: meta }),
      clearPdf: () =>
        set({
          pdf: null,
          metersPerPdfUnit: null,
          calibrationPdfLength: null,
          measurements: [],
          selectedId: null,
          tool: "select",
          rotation: 0,
        }),
      setCalibration: (metersPerPdfUnit, pdfLength) =>
        set({ metersPerPdfUnit, calibrationPdfLength: pdfLength }),
      setScaleMeters: (meters) =>
        set((s) => {
          if (s.calibrationPdfLength == null || s.calibrationPdfLength <= 0) return s;
          return { metersPerPdfUnit: meters / s.calibrationPdfLength };
        }),
      resetScale: () =>
        set({ metersPerPdfUnit: null, calibrationPdfLength: null }),
      setTool: (tool) => set({ tool, selectedId: null }),
      setUnits: (units) => set({ units }),
      toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
      rotateBy: (deg) =>
        set((s) => ({ rotation: normalizeRotation(s.rotation + deg) })),
      resetRotation: () => set({ rotation: 0 }),
      addMeasurement: (m) => {
        const id = newId();
        const color =
          m.color && m.color.length > 0
            ? m.color
            : PALETTE[get().measurements.length % PALETTE.length];
        const full: Measurement = { ...m, id, color };
        set((s) => ({
          measurements: [...s.measurements, full],
          selectedId: id,
        }));
        return id;
      },
      updateMeasurement: (id, patch) =>
        set((s) => ({
          measurements: s.measurements.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        })),
      removeMeasurement: (id) =>
        set((s) => ({
          measurements: s.measurements.filter((m) => m.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),
      clearMeasurements: () => set({ measurements: [], selectedId: null }),
      setSelected: (selectedId) => set({ selectedId }),
      resetAll: () =>
        set({
          pdf: null,
          metersPerPdfUnit: null,
          calibrationPdfLength: null,
          measurements: [],
          selectedId: null,
          tool: "select",
          rotation: 0,
        }),
    }),
    {
      name: "docmark.v1",
      version: 5,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        pdf: s.pdf,
        metersPerPdfUnit: s.metersPerPdfUnit,
        calibrationPdfLength: s.calibrationPdfLength,
        measurements: s.measurements,
        units: s.units,
        showLabels: s.showLabels,
        rotation: s.rotation,
      }),
      migrate: (persisted: unknown, fromVersion: number) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (fromVersion < 2 && p.calibrationPdfLength == null) {
          p.metersPerPdfUnit = null;
          p.calibrationPdfLength = null;
        }
        if (fromVersion < 3) {
          const ms = (p.measurements as Array<Record<string, unknown>> | undefined) ?? [];
          p.measurements = ms.map((m) => ({
            strokeWidth: DEFAULT_STROKE_WIDTH,
            lineStyle: DEFAULT_LINE_STYLE,
            fillOpacity: DEFAULT_FILL_OPACITY,
            ...m,
          }));
        }
        if (fromVersion < 4) {
          const ms = (p.measurements as Array<Record<string, unknown>> | undefined) ?? [];
          p.measurements = ms.map((m) => ({
            showMeasurements: true,
            ...m,
          }));
        }
        if (fromVersion < 5) {
          const meta = p.pdf as Record<string, unknown> | null | undefined;
          if (meta && typeof meta === "object" && meta.documentKind == null) {
            meta.documentKind = "pdf";
          }
        }
        return p;
      },
    },
  ),
);
