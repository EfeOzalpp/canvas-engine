import type { RenderCachePolicy } from "../../cache-policy";
import { createFarShapeBitmapRenderer } from "./cache/farShapeBitmap";
import { createShapeDepthOverlayRenderer } from "../depth";

export function createShapeRenderCache(getPolicy: () => RenderCachePolicy) {
  const drawFarShapeBitmap = createFarShapeBitmapRenderer(() => getPolicy().farShapeBitmap);
  const depthOverlay = createShapeDepthOverlayRenderer(() => getPolicy().shapeDepthMask);

  return {
    drawFarShapeBitmap,
    drawShapeDepthOverlay: depthOverlay.draw,
    sampleShapeHitMask: depthOverlay.sampleHitMask,
    clear() {
      drawFarShapeBitmap.clear();
      depthOverlay.clear();
    },
  };
}
