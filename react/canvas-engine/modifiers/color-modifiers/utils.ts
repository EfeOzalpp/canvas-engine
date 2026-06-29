// Shared color primitives. Keep these boring because every color helper leans on them.

import type { RGB } from "../../shared/math";
import { clamp01, lerpNumber } from "../../shared/math";

export type { RGB };
export { clamp01 };

export interface Stop {
  stop: number;
  color: RGB;
}

// Small p5-like surface used when a shape hands us a CSS color string.
interface CanvasColorAdapter {
  color(css: string): unknown;
  red(color: unknown): number;
  green(color: unknown): number;
  blue(color: unknown): number;
}

export function lerp(a: number, b: number, t: number): number {
  return lerpNumber(a, b, t);
}

// Canvas already knows how to parse CSS colors, so we ask it for numeric RGB.
export function cssToRgbViaCanvas(p: CanvasColorAdapter, css: string): RGB {
  const color = p.color(css);
  return { r: p.red(color), g: p.green(color), b: p.blue(color) };
}
