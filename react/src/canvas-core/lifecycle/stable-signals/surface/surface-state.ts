import type { RenderSurface } from "../../../../render-api";

export interface SurfaceStateInput {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
}

export interface SurfaceState extends RenderSurface {
  dpr: number;
  aspect: number;
}

function positiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function createSurfaceState(input: SurfaceStateInput): SurfaceState {
  const cssWidth = Math.max(1, Math.round(positiveNumber(input.cssWidth, 1)));
  const cssHeight = Math.max(1, Math.round(positiveNumber(input.cssHeight, 1)));
  const dpr = positiveNumber(input.dpr, 1);

  return {
    cssWidth,
    cssHeight,
    pixelWidth: Math.max(1, Math.round(cssWidth * dpr)),
    pixelHeight: Math.max(1, Math.round(cssHeight * dpr)),
    dpr,
    aspect: cssWidth / cssHeight,
  };
}
