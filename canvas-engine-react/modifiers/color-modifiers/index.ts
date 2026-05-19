// Public color modifier surface. Import from here unless a deeper file owns your exact use case.

export { clamp01, lerp, cssToRgbViaCanvas } from "./utils";
export type { CanvasColorAdapter, RGB, Stop } from "./utils";

export {
  hslToRgb,
  linToSrgb,
  mixRGB,
  mixRGBGamma,
  rgbToHsl,
  srgbToLin,
} from "./colorspace";

export { blendRGB, blendRGBGamma, blendRGBSmart } from "./blend";

export {
  applyExposureContrast,
  clampBrightness,
  clampSaturation,
  driveBrightness,
  driveSaturation,
  oscillateBrightness,
  oscillateSaturation,
} from "./effects";

export { fogifyPalette } from "./fog";
export { gradientColor, rgbToCss } from "./gradient";
export { VIVID_COLOR_STOPS } from "./stops";
export { computeVisualStyle } from "./style";
export type { VisualStyle } from "./style";
