// Color blending helpers. Linear blend is kept for old shape behavior; gamma blend looks better for light.

import type { RGB } from "./utils";
import { clamp01 } from "./utils";
import { mixRGB, mixRGBGamma } from "./colorspace";

export function blendRGB(base: RGB, gradientRGB?: RGB, blend = 0.5): RGB {
  if (!gradientRGB) return base;
  const k = clamp01(blend);
  return mixRGB(base, gradientRGB, k);
}

export function blendRGBGamma(base: RGB, gradientRGB?: RGB, blend = 0.5): RGB {
  if (!gradientRGB) return base;
  const k = clamp01(blend);
  return mixRGBGamma(base, gradientRGB, k);
}
