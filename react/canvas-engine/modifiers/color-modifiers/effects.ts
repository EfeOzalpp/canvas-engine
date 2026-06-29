// Artistic color transforms used by shapes: saturation, brightness, and exposure/contrast.

import type { RGB } from "./utils";
import { clamp01 } from "./utils";
import { hslToRgb, linToSrgb, rgbToHsl, srgbToLin } from "./colorspace";

export function oscillateSaturation(
  base: RGB,
  timeSec: number,
  { amp = 0.15, speed = 0.25, phase = 0 }: { amp?: number; speed?: number; phase?: number } = {}
): RGB {
  const { h, s, l } = rgbToHsl(base);
  const k = clamp01(amp);
  const w = speed * 2 * Math.PI;
  const s2 = clamp01(s * (1 + k * Math.sin(w * timeSec + phase)));
  return hslToRgb({ h, s: s2, l });
}

export function clampSaturation(base: RGB, minS: number, maxS: number, t = 1): RGB {
  const { h, s, l } = rgbToHsl(base);
  const targetS = Math.min(maxS, Math.max(minS, s));
  const lerpedS = s + (targetS - s) * clamp01(t);
  return hslToRgb({ h, s: lerpedS, l });
}

export function oscillateBrightness(
  base: RGB,
  timeSec: number,
  { amp = 0.15, speed = 0.25, phase = 0 }: { amp?: number; speed?: number; phase?: number } = {}
): RGB {
  const { h, s, l } = rgbToHsl(base);
  const k = clamp01(amp);
  const w = speed * 2 * Math.PI;
  const l2 = clamp01(l * (1 + k * Math.sin(w * timeSec + phase)));
  return hslToRgb({ h, s, l: l2 });
}

export function clampBrightness(base: RGB, minL: number, maxL: number, t = 1): RGB {
  const { h, s, l } = rgbToHsl(base);
  const targetL = Math.min(maxL, Math.max(minL, l));
  const lerpedL = l + (targetL - l) * clamp01(t);
  return hslToRgb({ h, s, l: lerpedL });
}

export function driveSaturation(base: RGB, t: number, s0: number, s1: number): RGB {
  const { h, l } = rgbToHsl(base);
  const sTarget = clamp01(s0 + (s1 - s0) * clamp01(t));
  return hslToRgb({ h, s: sTarget, l });
}

export function scaleRgb({ r, g, b }: RGB, k: number): RGB {
  const scale = (value: number) => Math.max(0, Math.min(255, Math.round(value * k)));
  return { r: scale(r), g: scale(g), b: scale(b) };
}

// Direct sRGB/channel-space exposure used by the authored Canvas2D shapes.
// This preserves their current palette response; the default applyExposureContrast
// below is perceptual and used by higher-level visual style composition.
export function applySrgbExposureContrast(rgb: RGB, exposure = 1, contrast = 1): RGB {
  const e = Math.max(0.1, Math.min(3, exposure));
  const k = Math.max(0.5, Math.min(2, contrast));
  const adjust = (v: number): number => {
    let x = (v / 255) * e;
    x = (x - 0.5) * k + 0.5;
    return Math.max(0, Math.min(1, x)) * 255;
  };

  return {
    r: Math.round(adjust(rgb.r)),
    g: Math.round(adjust(rgb.g)),
    b: Math.round(adjust(rgb.b)),
  };
}

/** Simple perceptual exposure / contrast adjustment (in linear space) */
export function applyExposureContrast(base: RGB, exposure = 1.0, contrast = 1.0): RGB {
  const e = Math.max(0.01, Math.min(5, exposure));
  const c = Math.max(0.0, Math.min(3, contrast));

  const lin = {
    r: srgbToLin(base.r),
    g: srgbToLin(base.g),
    b: srgbToLin(base.b),
  };

  return {
    r: linToSrgb(Math.pow(lin.r * e, c)),
    g: linToSrgb(Math.pow(lin.g * e, c)),
    b: linToSrgb(Math.pow(lin.b * e, c)),
  };
}
