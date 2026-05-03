import type { DocumentPage, LoadedDocument } from "./types";

export const loadImageDocument = async (file: File): Promise<LoadedDocument> => {
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.src = objectUrl;
  // `decode()` resolves once the image is fully loaded and ready to draw, and
  // guarantees naturalWidth/Height are populated.
  try {
    await img.decode();
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
  const baseW = img.naturalWidth;
  const baseH = img.naturalHeight;
  if (!baseW || !baseH) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Image has zero dimensions");
  }

  let destroyed = false;
  const documentPage: DocumentPage = {
    width: baseW,
    height: baseH,
    getViewport: ({ scale, rotation }) => {
      const rotated = rotation === 90 || rotation === 270;
      return {
        width: (rotated ? baseH : baseW) * scale,
        height: (rotated ? baseW : baseH) * scale,
      };
    },
    render: async ({ ctx, scale, rotation }) => {
      const rotated = rotation === 90 || rotation === 270;
      const dstW = (rotated ? baseH : baseW) * scale;
      const dstH = (rotated ? baseW : baseH) * scale;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // Rotate around the top-left of the destination box.
      switch (rotation) {
        case 0:
          break;
        case 90:
          ctx.translate(dstW, 0);
          ctx.rotate(Math.PI / 2);
          break;
        case 180:
          ctx.translate(dstW, dstH);
          ctx.rotate(Math.PI);
          break;
        case 270:
          ctx.translate(0, dstH);
          ctx.rotate(-Math.PI / 2);
          break;
      }
      // After rotate, the image is drawn in its base-orientation coords.
      ctx.drawImage(img, 0, 0, baseW * scale, baseH * scale);
      ctx.restore();
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      URL.revokeObjectURL(objectUrl);
    },
  };

  return {
    kind: "image",
    page: documentPage,
    pageWidth: baseW,
    pageHeight: baseH,
  };
};
