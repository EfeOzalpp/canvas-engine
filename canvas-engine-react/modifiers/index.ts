// Public modifier surface for the canvas engine.

// Color helpers.
export { clamp01 } from "./color-modifiers";
export { rgbToHsl, hslToRgb } from "./color-modifiers";
export { blendRGB, blendRGBGamma } from "./color-modifiers";
export { fogifyPalette } from "./color-modifiers";
export { cssToRgbViaCanvas } from "./color-modifiers";
export {
  oscillateSaturation,
  oscillateBrightness,
  clampBrightness,
  clampSaturation,
  driveSaturation,
} from "./color-modifiers";
export { gradientColor } from "./color-modifiers";
export { VIVID_COLOR_STOPS } from "./color-modifiers";
export type { RGB, Stop } from "./color-modifiers";

// Shape geometry and transform helpers.
export { displacementOsc, makeArchLobes } from "./shape-modifiers";
// The legacy surface expects clamp01/val/mix to come from modifiers.
// clamp01 would collide with color clamp01, so keep the old names:
// - clamp01 from color
// - val/mix from shape range helpers
export { val, mix } from "./shape-modifiers";
export { applyShapeMods } from "./shape-modifiers";
export type { Anchor, ShapeMods, ApplyShapeModsOpts } from "./shape-modifiers";

// Particle emitters and particle-specific perspective helpers.
export {
  particleBucketRange,
  particleRowBucket,
  stepAndDrawParticles,
  stepAndDrawPuffs,
} from "./particles";

// Scene lighting and light painting helpers.
export {
  createSceneLightContext,
  lightClosenessBand,
  pickLightBandValue,
  sampleDirectionalLightRect,
  mixRgb,
  paintEdgeGradientRect,
  paintDirectionalTriangleBands,
  paintPixelLightBands,
} from "./lighting";
export type {
  DirectionalLightSample,
  LightClosenessBand,
  LightClosenessBandMap,
  SceneLightContext,
} from "./lighting";

// Grid placement to pixel projection.
export {
  footprintToPx,
  rowHeightAt,
  rowWidthAt,
  particlePerspectiveScale,
  particleSizePerspectiveScale,
  particleMotionPerspectiveScale,
} from "./projection";
export type { GridFootprint, PixelRect, ProjectionContext } from "./projection";
