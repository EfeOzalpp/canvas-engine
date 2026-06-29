// Public modifier surface for the canvas engine.

// Shared math/color primitives.
export { clamp01, lerpNumber, mixRgb } from "../shared/math";

// Color helpers.
export { rgbToHsl, hslToRgb } from "./color-modifiers";
export { blendRGB, blendRGBGamma } from "./color-modifiers";
export { fogifyPalette } from "./color-modifiers";
export { cssToRgbViaCanvas } from "./color-modifiers";
export {
  applySrgbExposureContrast,
  oscillateSaturation,
  oscillateBrightness,
  clampBrightness,
  clampSaturation,
  driveSaturation,
  scaleRgb,
} from "./color-modifiers";
export { fillRgb, rgbaCss, strokeRgb } from "./color-modifiers";
export { gradientColor } from "./color-modifiers";
export { VIVID_COLOR_STOPS } from "./color-modifiers";
export type { RGB, Stop } from "./color-modifiers";

// Shape geometry and transform helpers.
export {
  beginFitScale,
  displacementOsc,
  endFitScale,
  fitScaleToRectWidth,
  makeArchLobes,
  roundedRectPath,
  pick,
  pickByOccurrence,
  seeded01,
  seededTag01,
  seededUnit,
  shapeHash32,
} from "./shape-modifiers";
export { resolveRangeValue } from "./shape-modifiers";
export { applyShapeMods } from "./global-event-driven/apply";
export type { ShapeMods, NumberRange } from "./shape-modifiers";
export { clampMinMax, finiteNumber, smoothstep01 } from "../shared/math";
export {
  applyDepthTint,
  shapeColorForRenderPass,
  shouldDrawInRenderPass,
} from "./render-pass";
export type { ShapeRenderPass, ShapeRenderPassOptions } from "./render-pass";

// Particle emitters and particle-specific perspective helpers.
export {
  particleBucketRange,
  particleDepthAlpha,
  particleDepthSizeScale,
  particleRowBucket,
  createParticleStore,
  stepAndDrawParticles,
  stepAndDrawPuffs,
} from "./particles";
export type { ParticleStore } from "./particles";

// Scene lighting and light painting helpers.
export {
  createSceneLightContext,
  lightClosenessBand,
  pickLightBandValue,
  sampleDirectionalLightRect,
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
