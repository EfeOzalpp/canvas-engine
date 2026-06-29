import type { PLike } from "../../../p/makeP";
import {
  clearOffscreenEntry,
  createOffscreenCache,
  drawCanvasLayer,
  getOrCreateCanvasLayer,
} from "../../cache/offscreenCache";
import { drawRowTopLightOverlay } from "./rowLight";

// Offscreen cache for drawRowTopLightOverlay: pure geometry, no time dependency.
export function createRowLightCache() {
  const cache = createOffscreenCache();
  let cacheKey = "";

  const drawRowLightCached = function drawRowLightCached(args: Parameters<typeof drawRowTopLightOverlay>[0]) {
    const { p, metrics, light, alpha = 1, compositeAlpha = 1, minRow = 0, maxRowExclusive } = args;
    if (!light || alpha <= 0 || compositeAlpha <= 0) return;

    const w = p.width;
    const h = p.height;
    const { entry, targetChanged } = getOrCreateCanvasLayer(cache, p);
    if (targetChanged) cacheKey = "";

    const key = [
      String(w),
      String(h),
      alpha.toFixed(3),
      String(minRow),
      maxRowExclusive == null ? "end" : String(maxRowExclusive),
      light.sourceX.toFixed(1),
      light.sourceY.toFixed(1),
      light.sceneDiag.toFixed(1),
      metrics.rowHeights.join(","),
      metrics.rowOffsetY.join(","),
    ].join("|");

    if (key !== cacheKey) {
      clearOffscreenEntry(entry);
      const fakeP = {
        drawingContext: entry.ctx,
        width: entry.bounds.w,
        height: entry.bounds.h,
      } as unknown as PLike;
      drawRowTopLightOverlay({ p: fakeP, metrics, light, alpha, minRow, maxRowExclusive });
      cacheKey = key;
    }

    drawCanvasLayer(p, entry, compositeAlpha);
  };

  return Object.assign(drawRowLightCached, {
    clear() {
      cache.clear();
      cacheKey = "";
    },
  });
}
