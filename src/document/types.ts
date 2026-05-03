import type { Rotation } from "../draw/rotation";

export type DocumentKind = "pdf" | "image";

export type DocumentPage = {
  /** Base, unrotated dims (PDF page units = points; image pixels) */
  width: number;
  height: number;
  /** Rotated viewport dims for canvas sizing */
  getViewport(opts: {
    scale: number;
    rotation: Rotation;
  }): { width: number; height: number };
  /** Render the page into ctx at the given scale + rotation. Caller sizes the canvas. */
  render(opts: {
    ctx: CanvasRenderingContext2D;
    scale: number;
    rotation: Rotation;
  }): Promise<void>;
  destroy(): void;
};

export type LoadedDocument = {
  kind: DocumentKind;
  page: DocumentPage;
  pageWidth: number;
  pageHeight: number;
};
