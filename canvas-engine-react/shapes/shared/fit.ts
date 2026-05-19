import type { ShapeCanvas } from "../types";

export interface FitScaleOptions {
  allowUpscale?: boolean;
}

export interface FitScaleTransform {
  cx: number;
  anchorY: number;
  scale: number;
}

export function fitScaleToRectWidth(
  contentW: number,
  rectW: number,
  pad = 0,
  { allowUpscale = false }: FitScaleOptions = {}
): number {
  const usable = Math.max(1, rectW - pad * 2);
  const scale = usable / Math.max(1, contentW);
  return allowUpscale ? scale : Math.min(1, scale);
}

export function beginFitScale(p: ShapeCanvas, { cx, anchorY, scale }: FitScaleTransform): void {
  p.push();
  p.translate(cx, anchorY);
  p.scale(scale, scale);
  p.translate(-cx, -anchorY);
}

export function endFitScale(p: ShapeCanvas): void {
  p.pop();
}
