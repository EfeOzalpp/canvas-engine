// Public color modifier surface. Import from here unless a deeper file owns your exact use case.

export { cssToRgbViaCanvas } from "./utils";
export type { RGB, Stop } from "./utils";

export {
  hslToRgb,
  rgbToHsl,
} from "./colorspace";

export { blendRGB, blendRGBGamma } from "./blend";

export {
  applySrgbExposureContrast,
  clampBrightness,
  clampSaturation,
  driveSaturation,
  oscillateBrightness,
  oscillateSaturation,
  scaleRgb,
} from "./effects";

export { fillRgb, rgbaCss, strokeRgb } from "./canvas";
export { fogifyPalette } from "./fog";
export { gradientColor } from "./gradient";
export { VIVID_COLOR_STOPS } from "./stops";
