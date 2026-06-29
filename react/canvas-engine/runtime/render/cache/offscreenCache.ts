import { getCanvasMeta, setCanvasMeta } from "../../p/canvasMeta";
import { makeP, type PLike } from "../../p/makeP";

export interface OffscreenBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OffscreenCacheEntry<Bounds extends OffscreenBounds = OffscreenBounds> {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  p: PLike;
  bounds: Bounds;
  pixels: number;
}

export interface OffscreenCache<Bounds extends OffscreenBounds = OffscreenBounds> {
  readonly size: number;
  readonly pixels: number;
  get(key: string): OffscreenCacheEntry<Bounds> | undefined;
  createEntry(bounds: Bounds, dpr: number): OffscreenCacheEntry<Bounds>;
  set(key: string, entry: OffscreenCacheEntry<Bounds>): void;
  touch(key: string, entry: OffscreenCacheEntry<Bounds>): void;
  clear(): number;
  syncRenderTarget(p: PLike, dpr: number): { changed: boolean; cleared: number };
  trim(maxPixels: number): number;
}

const CANVAS_LAYER_KEY = "canvas-layer";

function safeDpr(dpr: number) {
  return Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
}

function rounded(value: number, precision = 10) {
  return String(Math.round(value * precision) / precision);
}

export function canvasDpr(p: PLike) {
  return getCanvasMeta(p.canvas).dpr ?? 1;
}

function renderTargetKey(p: PLike, dpr: number) {
  return [
    String(p.canvas.width),
    String(p.canvas.height),
    rounded(p.width),
    rounded(p.height),
    rounded(dpr, 100),
  ].join("|");
}

export function snapBoundsToDevicePixels<Bounds extends OffscreenBounds>(bounds: Bounds, dpr: number): Bounds {
  const ratio = safeDpr(dpr);
  const left = Math.floor(bounds.x * ratio);
  const top = Math.floor(bounds.y * ratio);
  const right = Math.ceil((bounds.x + bounds.w) * ratio);
  const bottom = Math.ceil((bounds.y + bounds.h) * ratio);

  return {
    ...bounds,
    x: left / ratio,
    y: top / ratio,
    w: Math.max(1, right - left) / ratio,
    h: Math.max(1, bottom - top) / ratio,
  };
}

export function pixelSizeForBounds(bounds: OffscreenBounds, dpr: number) {
  const ratio = safeDpr(dpr);
  const pixelW = Math.max(1, Math.round(bounds.w * ratio));
  const pixelH = Math.max(1, Math.round(bounds.h * ratio));
  return {
    pixelW,
    pixelH,
    pixels: pixelW * pixelH,
  };
}

export function maxCachePixelsForCanvas(p: PLike, maxPixelsPerCanvasPixel: number) {
  return Math.max(1, Math.floor(p.canvas.width * p.canvas.height * maxPixelsPerCanvasPixel));
}

export function clearOffscreenEntry(entry: OffscreenCacheEntry) {
  entry.ctx.setTransform(1, 0, 0, 1, 0, 0);
  entry.ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
}

export function drawCanvasLayer(
  p: PLike,
  entry: OffscreenCacheEntry,
  compositeAlpha = 1
) {
  const alpha = Math.max(0, Math.min(1, compositeAlpha));
  if (alpha <= 0) return;

  const ctx = p.drawingContext;
  if (alpha >= 1) {
    ctx.drawImage(entry.canvas, 0, 0);
    return;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(entry.canvas, 0, 0);
  ctx.restore();
}

export function getOrCreateCanvasLayer(
  cache: OffscreenCache,
  p: PLike,
  dpr = 1
) {
  const target = cache.syncRenderTarget(p, dpr);
  let entry = cache.get(CANVAS_LAYER_KEY);
  if (!entry) {
    entry = cache.createEntry({ x: 0, y: 0, w: p.width, h: p.height }, dpr);
    cache.set(CANVAS_LAYER_KEY, entry);
  }

  return {
    entry,
    targetChanged: target.changed,
  };
}

function releaseEntry(entry: OffscreenCacheEntry | undefined) {
  if (!entry) return;
  entry.canvas.width = 1;
  entry.canvas.height = 1;
}

function createEntry<Bounds extends OffscreenBounds>(bounds: Bounds, dpr: number): OffscreenCacheEntry<Bounds> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context not available");
  const p = makeP(canvas, ctx);

  const { pixelW, pixelH, pixels } = pixelSizeForBounds(bounds, dpr);
  canvas.width = pixelW;
  canvas.height = pixelH;
  setCanvasMeta(canvas, { dpr, cssW: bounds.w, cssH: bounds.h });

  return { canvas, ctx, p, bounds, pixels };
}

export function createOffscreenCache<Bounds extends OffscreenBounds>(): OffscreenCache<Bounds> {
  const entries = new Map<string, OffscreenCacheEntry<Bounds>>();
  let pixels = 0;
  let targetKey = "";

  function clearEntries() {
    const count = entries.size;
    for (const entry of entries.values()) releaseEntry(entry);
    entries.clear();
    pixels = 0;
    return count;
  }

  function trimEntries(maxPixels: number) {
    let trimmed = 0;
    while (pixels > maxPixels) {
      const oldest = entries.keys().next().value;
      if (typeof oldest !== "string") return trimmed;
      const entry = entries.get(oldest);
      pixels -= entry?.pixels ?? 0;
      entries.delete(oldest);
      releaseEntry(entry);
      trimmed += 1;
    }
    return trimmed;
  }

  return {
    get size() {
      return entries.size;
    },

    get pixels() {
      return pixels;
    },

    get(key: string) {
      return entries.get(key);
    },

    createEntry(bounds: Bounds, dpr: number) {
      return createEntry(bounds, dpr);
    },

    set(key: string, entry: OffscreenCacheEntry<Bounds>) {
      const existing = entries.get(key);
      if (existing === entry) {
        entries.set(key, entry);
        return;
      }
      if (existing) {
        pixels -= existing.pixels;
        releaseEntry(existing);
      }

      pixels += entry.pixels;
      entries.set(key, entry);
    },

    touch(key: string, entry: OffscreenCacheEntry<Bounds>) {
      entries.delete(key);
      entries.set(key, entry);
    },

    clear() {
      const cleared = clearEntries();
      targetKey = "";
      return cleared;
    },

    syncRenderTarget(p: PLike, dpr: number) {
      const nextKey = renderTargetKey(p, dpr);
      if (nextKey === targetKey) return { changed: false, cleared: 0 };
      const cleared = clearEntries();
      targetKey = nextKey;
      return { changed: true, cleared };
    },

    trim(maxPixels: number) {
      return trimEntries(maxPixels);
    },
  };
}
