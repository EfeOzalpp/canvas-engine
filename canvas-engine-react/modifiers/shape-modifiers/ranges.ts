// Shape configs often accept either a fixed number or a [from, to] range.
// These helpers resolve those small art-direction ranges from a 0..1 driver.

export type NumberRange = [number, number];

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function val(v: number | NumberRange, u: number): number {
  return Array.isArray(v) ? mix(v[0], v[1], clamp01(u)) : v;
}
