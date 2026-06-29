import type { ViewportMode } from "../payload.types";

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasPixelSize {
  width: number;
  height: number;
}

// stable signal (resize observer)
export function resolveCanvasResizeSignalTarget(
  canvas: HTMLCanvasElement,
  mode: ViewportMode
): HTMLElement | null {
  if (mode.kind === "fixed") return null;
  if (mode.kind === "full-viewport") return document.documentElement;
  return canvas.parentElement;
}

export function resolveCanvasSize(canvas: HTMLCanvasElement, mode: ViewportMode): CanvasSize {
  if (mode.kind === "fixed") {
    return { width: mode.width, height: mode.height };
  }

  if (mode.kind === "full-viewport") {
    return {
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight),
    };
  }

  const parent = canvas.parentElement;
  const rect = parent?.getBoundingClientRect();

  return {
    width: Math.max(1, Math.round(rect?.width || canvas.clientWidth || 1)),
    height: Math.max(1, Math.round(rect?.height || canvas.clientHeight || 1)),
  };
}

export function applyCanvasCssSize(canvas: HTMLCanvasElement, size: CanvasSize) {
  canvas.style.width = `${String(size.width)}px`;
  canvas.style.height = `${String(size.height)}px`;
}

export function applyCanvasPixelSize(
  canvas: HTMLCanvasElement,
  size: CanvasPixelSize
) {
  canvas.width = Math.max(1, Math.round(size.width));
  canvas.height = Math.max(1, Math.round(size.height));
}
