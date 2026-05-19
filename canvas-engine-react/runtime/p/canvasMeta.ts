// src/canvas-engine/runtime/p/canvasMeta.ts

export interface CanvasMeta {
  dpr?: number;
  cssW?: number;
  cssH?: number;
}

const EMPTY_CANVAS_META: CanvasMeta = {};
const canvasMeta = new WeakMap<HTMLCanvasElement, CanvasMeta>();

// Keep engine-only canvas state out of the DOM node itself.
// WeakMap fits here because the canvas is the lookup key, but this metadata should
// disappear once the canvas element is gone.
export function getCanvasMeta(canvas: HTMLCanvasElement): CanvasMeta {
  return canvasMeta.get(canvas) ?? EMPTY_CANVAS_META;
}

export function setCanvasMeta(
  canvas: HTMLCanvasElement,
  next: Partial<CanvasMeta>
): CanvasMeta {
  const prev = getCanvasMeta(canvas);
  const meta: CanvasMeta = { ...prev };

  if (next.dpr !== undefined) meta.dpr = next.dpr;
  if (next.cssW !== undefined) meta.cssW = next.cssW;
  if (next.cssH !== undefined) meta.cssH = next.cssH;

  canvasMeta.set(canvas, meta);
  return meta;
}
