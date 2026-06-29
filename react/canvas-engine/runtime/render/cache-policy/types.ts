// src/canvas-engine/runtime/render/cache-policy/types.ts

export interface FarShapeBitmapCachePolicy {
  enabled: boolean;
  farSizeK: number;
  maxPixelsPerCanvasPixel: number;
  maxBakesPerFrame: number;
  alwaysLiveShapes: readonly string[];
}

export interface ShapeDepthMaskCachePolicy {
  maxPixelsPerCanvasPixel: number;
  maxBakesPerFrame: number;
  minBlend: number;
  alwaysLiveShapes: readonly string[];
}

export interface RenderCachePolicy {
  farShapeBitmap: FarShapeBitmapCachePolicy;
  shapeDepthMask: ShapeDepthMaskCachePolicy;
}
