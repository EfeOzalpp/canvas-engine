// src/canvas-engine/adjustable-rules/backgrounds/export.ts
// shim - re-exports the public backgrounds API.

export type {
  RgbaStop,
  BackgroundStopAnchor,
  BackgroundStopK,
  BackgroundAnchorContext,
  RadialGradientSpec,
  LinearGradientSpec,
  SolidBackgroundSpec,
  BackgroundSpec,
  BackgroundsByMode,
  StartBackgroundLookupKey,
  StartBackgroundsByMode,
} from "./index";

export {
  BACKGROUNDS,
  BACKGROUNDS_LIGHT,
  BACKGROUNDS_DARK,
  BACKGROUNDS_START_DARK,
  BACKGROUNDS_CITY,
  BACKGROUNDS_CITY_DARK,
} from "./index";
