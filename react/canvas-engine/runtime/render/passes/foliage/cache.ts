import type { BackgroundAnchorContext } from "../../../../scene-rules/backgrounds";
import type { FoliageSceneSpec } from "../../../../scene-rules/foliage";
import type { PLike } from "../../../p/makeP";
import {
  clearOffscreenEntry,
  createOffscreenCache,
  drawCanvasLayer,
  getOrCreateCanvasLayer,
} from "../../cache/offscreenCache";
import { drawFoliageLayer } from "./foliage";

export function createFoliageLayerCache() {
  const cache = createOffscreenCache();
  let cacheKey = "";
  let lastSpec: FoliageSceneSpec | null | undefined = undefined;

  const drawFoliageLayerCached = function drawFoliageLayerCached(args: {
    p: PLike;
    spec?: FoliageSceneSpec | null;
    liveAvg: number;
    anchors?: BackgroundAnchorContext;
    compositeAlpha?: number;
  }) {
    const { p, spec, liveAvg, anchors, compositeAlpha = 1 } = args;
    if (!spec || spec.layers.length === 0 || compositeAlpha <= 0) return;

    const { entry, targetChanged } = getOrCreateCanvasLayer(cache, p);
    if (targetChanged) cacheKey = "";

    const liveAvgQ = Math.round(liveAvg * 100);
    const key = [
      String(p.width),
      String(p.height),
      String(liveAvgQ),
      anchors?.visualHorizonK.toFixed(4) ?? "no-anchor",
    ].join("|");

    if (key !== cacheKey || spec !== lastSpec) {
      clearOffscreenEntry(entry);
      const fakeP = {
        drawingContext: entry.ctx,
        width: entry.bounds.w,
        height: entry.bounds.h,
      } as unknown as PLike;
      drawFoliageLayer({ p: fakeP, spec, liveAvg, anchors });
      cacheKey = key;
      lastSpec = spec;
    }

    drawCanvasLayer(p, entry, compositeAlpha);
  };

  return Object.assign(drawFoliageLayerCached, {
    clear() {
      cache.clear();
      cacheKey = "";
      lastSpec = undefined;
    },
  });
}
