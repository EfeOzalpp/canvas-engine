import type { RandomSource } from "./types";

export function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function smoothstep01(t: number) {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
}

export function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Shared PRNG. Hashing stays local to each emitter because their seed contracts differ.
export function makePRNG(seed: number): RandomSource {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rnd: RandomSource, a: number, b: number) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return mix(lo, hi, rnd());
}

export function hzLerp(current: number, target: number, hz: number, dt: number) {
  if (!(hz > 0) || !(dt > 0)) return target;
  const k = 1 - Math.exp(-hz * dt);
  return current + (target - current) * k;
}
