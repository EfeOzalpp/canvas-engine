export function clamp01(v: number | undefined) {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function clampMinMax(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function smoothstep01(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

export interface RGB { r: number; g: number; b: number }

export function mixRgb(base: RGB, target: RGB, k: number): RGB {
  const kk = clamp01(k);
  return {
    r: Math.round(lerpNumber(base.r, target.r, kk)),
    g: Math.round(lerpNumber(base.g, target.g, kk)),
    b: Math.round(lerpNumber(base.b, target.b, kk)),
  };
}
