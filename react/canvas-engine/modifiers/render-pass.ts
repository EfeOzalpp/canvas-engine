import type { RGB } from "../shared/math";
import { blendRGB } from "./color-modifiers";

// Color pass draws authored details. Depth mask pass draws stable mass only.
export type ShapeRenderPass = "color" | "depthMask";

export interface ShapeRenderPassOptions {
  renderPass?: ShapeRenderPass;
  maskColor?: RGB;
  maskAlpha?: number;
  depthTintColor?: RGB;
  depthTintK?: number;
}

// Depth mask passes use white by default so the engine can tint an offscreen mask.
// Inline depth overlays can pass their final color directly.
export const DEFAULT_MASK_RGB: RGB = { r: 255, g: 255, b: 255 };

export function shouldDrawInRenderPass(
  renderPass: ShapeRenderPass,
  includeInDepthMask: boolean
): boolean {
  return renderPass === "color" || includeInDepthMask;
}

// Color mode returns the authored color. Depth mask mode returns the mask color.
export function shapeColorForRenderPass(
  renderPass: ShapeRenderPass,
  color: RGB,
  maskColor: RGB = DEFAULT_MASK_RGB
): RGB {
  return renderPass === "depthMask" ? maskColor : color;
}

export function applyDepthTint(
  color: RGB,
  opts: Pick<ShapeRenderPassOptions, "depthTintColor" | "depthTintK">,
  strength = 1
): RGB {
  const tint = opts.depthTintColor;
  const k = opts.depthTintK;
  if (!tint || typeof k !== "number" || !Number.isFinite(k) || k <= 0) return color;
  return blendRGB(color, tint, Math.max(0, Math.min(1, k * strength)));
}
