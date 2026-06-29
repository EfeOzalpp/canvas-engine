import { clamp01, lerpNumber, smoothstep01 } from "../../shared/math";
import type { RandomSource } from "./types";

export { clamp01, smoothstep01 };

export function mix(a: number, b: number, t: number) {
  return lerpNumber(a, b, t);
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
