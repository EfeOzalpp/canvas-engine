// Public shape modifier surface.
// Shapes should import these through modifiers/index unless they truly need an internal helper.
export { withAppear } from "./appear";
export type { AppearParams } from "./appear";

export { makeArchLobes } from "./lobes";
export type { Lobe } from "./lobes";

export { displacementOsc } from "./displacement";

export { clamp01, mix, val } from "./ranges";
export type { NumberRange } from "./ranges";

export { applyShapeMods } from "./apply";
export type { Anchor, ApplyShapeModsOpts, ShapeMods } from "./types";
