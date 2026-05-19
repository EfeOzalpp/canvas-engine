// src/canvas-engine/runtime/util/easing.ts

import { clamp01 } from "../../shared/math";

export { clamp01 };

export function easeOutCubic(t: number) {
  t = clamp01(t);
  const u = 1 - t;
  return 1 - u * u * u;
}
