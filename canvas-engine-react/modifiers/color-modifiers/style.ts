// Higher-level visual style composer. This is a consumer of color helpers, not the folder index.

import { clamp01 } from "./utils";
import { gradientColor } from "./gradient";
import { applyExposureContrast } from "./effects";
import { VIVID_COLOR_STOPS } from "./stops";

export interface VisualStyle {
  rgb: { r: number; g: number; b: number };
  alpha: number;
  blend: number;
  hueShift: number;
  brightness: number;
}

function sampleBrandColor(avg: number) {
  return gradientColor(VIVID_COLOR_STOPS, avg).rgb;
}

export function computeVisualStyle(avg: number): VisualStyle {
  const t = clamp01(avg);
  const baseRGB = sampleBrandColor(t);

  const exposure = 1.0 + 0.4 * t;
  const contrast = 0.9 + 0.3 * t;

  const adjustedRGB = applyExposureContrast(baseRGB, exposure, contrast);

  return {
    rgb: adjustedRGB,
    alpha: 255,
    blend: 1.0,
    hueShift: 0,
    brightness: 1,
  };
}
