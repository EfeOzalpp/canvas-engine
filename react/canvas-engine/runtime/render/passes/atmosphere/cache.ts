import type { PLike } from "../../../p/makeP";
import {
  clearOffscreenEntry,
  createOffscreenCache,
  drawCanvasLayer,
  getOrCreateCanvasLayer,
} from "../../cache/offscreenCache";
import {
  drawFogLayer,
  gradientCacheKey,
  type FogState,
} from "./fog";

// Offscreen cache for the whole static fog layer. Depth lives in
// render/passes/depth, so this layer stays behind scene objects.
export function createFogLayerCache() {
  const cache = createOffscreenCache();
  let cacheKey = "";

  const drawFogLayerCached = function drawFogLayerCached(p: PLike, fog: FogState | null, compositeAlpha = 1) {
    if (!fog) return;

    const w = p.width;
    const h = p.height;
    const { entry, targetChanged } = getOrCreateCanvasLayer(cache, p);
    if (targetChanged) cacheKey = "";

    const key = [
      String(w),
      String(h),
      fog.fogStartY.toFixed(1),
      String(fog.horizonRow),
      fog.skyLayerAlpha.toFixed(4),
      String(fog.fogLayerAlpha255),
      String(fog.fogColor.r),
      String(fog.fogColor.g),
      String(fog.fogColor.b),
      gradientCacheKey(fog.skyFogGradient),
      gradientCacheKey(fog.groundFogGradient),
      fog.rowOffsetY.join(","),
      fog.groundFogLayerBoundaries.join(","),
    ].join("|");

    if (key !== cacheKey) {
      clearOffscreenEntry(entry);
      const fakeP = {
        drawingContext: entry.ctx,
        width: entry.bounds.w,
        height: entry.bounds.h,
      } as unknown as PLike;
      drawFogLayer(fakeP, fog);
      cacheKey = key;
    }

    drawCanvasLayer(p, entry, compositeAlpha);
  };

  return Object.assign(drawFogLayerCached, {
    clear() {
      cache.clear();
      cacheKey = "";
    },
  });
}
