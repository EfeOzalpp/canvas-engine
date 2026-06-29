// src/canvas-engine/runtime/render/passes/shape/palette.ts

import { gradientColor, VIVID_COLOR_STOPS } from "../../../../modifiers/index";
import type { RGB } from "../../../../shared/math";

interface PaletteCache {
  lastU: number;
  cachedGradient: RGB | null;
}

export function createPaletteCache(): PaletteCache {
  return { lastU: NaN, cachedGradient: null };
}

export function getGradientRGB(params: {
  liveAvg: number;
  override: RGB | null;
  cache: PaletteCache;
}): RGB | null {
  const { liveAvg, override, cache } = params;
  if (override) return override;

  const uq = Math.round(liveAvg * 1000) / 1000;
  if (uq !== cache.lastU) {
    cache.lastU = uq;
    cache.cachedGradient = gradientColor(VIVID_COLOR_STOPS, uq).rgb;
  }

  return cache.cachedGradient;
}
