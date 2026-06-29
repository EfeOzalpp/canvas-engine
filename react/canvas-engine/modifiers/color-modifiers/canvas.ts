import type { CanvasDrawSurface } from "../../shared/canvas";
import type { RGB } from "../../shared/math";

export function fillRgb(p: CanvasDrawSurface, { r, g, b }: RGB, alpha = 255): void {
  p.fill(r, g, b, alpha);
}

export function strokeRgb(p: CanvasDrawSurface, { r, g, b }: RGB, alpha = 255): void {
  p.stroke(r, g, b, alpha);
}

export function rgbaCss({ r, g, b }: RGB, alpha01: number): string {
  return `rgba(${String(r)},${String(g)},${String(b)},${String(alpha01)})`;
}
