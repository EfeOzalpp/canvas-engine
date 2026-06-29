// Public shape modifier surface.
// Shapes should import these through modifiers/index unless they truly need an internal helper.
export { makeArchLobes } from "./lobes";
export type { Lobe } from "./lobes";

export { displacementOsc } from "./displacement";
export { beginFitScale, endFitScale, fitScaleToRectWidth } from "./fit";
export type { FitScaleOptions, FitScaleTransform } from "./fit";
export { roundedRectPath } from "./path";
export {
  pick,
  pickByOccurrence,
  seeded01,
  seededTag01,
  seededUnit,
  shapeHash32,
} from "./random";

export { clamp01, lerpNumber, resolveRangeValue } from "./ranges";
export type { NumberRange } from "./ranges";

export type { ShapeMods } from "./types";
