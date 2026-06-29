import { makeP, type PLike } from "./runtime/p/makeP";

export type OffscreenShapeSurface = PLike;

export interface OffscreenShapeSurfaceOptions {
  dpr?: number;
}

// Public bridge for rendering shape drawers into a caller-owned canvas outside
// the mounted engine loop. This is intentionally separate from
// runtime/render/cache/offscreenCache.ts, which owns cached render-pass canvases.
export function makeOffscreenShapeSurface(
  canvas: HTMLCanvasElement,
  { dpr = 1 }: OffscreenShapeSurfaceOptions = {}
): OffscreenShapeSurface {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("2D canvas context not available");

  const p = makeP(canvas, ctx);
  const cssW = canvas.style.width ? parseFloat(canvas.style.width) : canvas.width / dpr;
  const cssH = canvas.style.height ? parseFloat(canvas.style.height) : canvas.height / dpr;

  p.pixelDensity(Math.max(1, dpr || 1));
  p.resizeCanvas(cssW, cssH);

  return p;
}
