import type { RGB } from "../../modifiers/index";
import type { ShapeCanvas } from "../types";

export function fillRgb(p: ShapeCanvas, { r, g, b }: RGB, alpha = 255): void {
  p.fill(r, g, b, alpha);
}

export function strokeRgb(p: ShapeCanvas, { r, g, b }: RGB, alpha = 255): void {
  p.stroke(r, g, b, alpha);
}

// This keeps the older shape-local exposure math. The modifier version is more
// perceptual, but swapping formulas would visually retune every migrated shape.
export function applyExposureContrast(rgb: RGB, exposure = 1, contrast = 1): RGB {
  const e = Math.max(0.1, Math.min(3, exposure));
  const k = Math.max(0.5, Math.min(2, contrast));
  const adjust = (v: number): number => {
    let x = (v / 255) * e;
    x = (x - 0.5) * k + 0.5;
    return Math.max(0, Math.min(1, x)) * 255;
  };

  return {
    r: Math.round(adjust(rgb.r)),
    g: Math.round(adjust(rgb.g)),
    b: Math.round(adjust(rgb.b)),
  };
}
