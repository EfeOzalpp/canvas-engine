export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export interface RGB { r: number; g: number; b: number }

export function mixRgb(base: RGB, target: RGB, k: number): RGB {
  const kk = clamp01(k);
  return {
    r: Math.round(base.r + (target.r - base.r) * kk),
    g: Math.round(base.g + (target.g - base.g) * kk),
    b: Math.round(base.b + (target.b - base.b) * kk),
  };
}
