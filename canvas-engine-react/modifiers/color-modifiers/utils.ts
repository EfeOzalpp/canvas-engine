// Shared color primitives. Keep these boring because every color helper leans on them.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Stop {
  stop: number;
  color: RGB;
}

// Small p5-like surface used when a shape hands us a CSS color string.
export interface CanvasColorAdapter {
  color(css: string): unknown;
  red(color: unknown): number;
  green(color: unknown): number;
  blue(color: unknown): number;
}

export function clamp01(v: number | undefined): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Canvas already knows how to parse CSS colors, so we ask it for numeric RGB.
export function cssToRgbViaCanvas(p: CanvasColorAdapter, css: string): RGB {
  const color = p.color(css);
  return { r: p.red(color), g: p.green(color), b: p.blue(color) };
}
