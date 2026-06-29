import type { EngineFieldItem } from "../../../engine/field";
import type { PLike } from "../../../p/makeP";
import type { GridMetrics } from "../../../geometry/gridCache";
import type { RGB } from "../../../../shared/math";
import { clamp01 } from "../../../../shared/math";

const DEPTH_FRONT_CLEAR_K = 0.18;
const DEPTH_ALPHA_CURVE = 1.85;
const DEPTH_ALPHA_MAX_DARK = 0.78;
const DEPTH_ALPHA_MAX_LIGHT = 0.68;

interface ShapeDepthTint {
  color: RGB;
  blend: number;
}

export function resolveShapeDepthColor(darkMode: boolean): RGB {
  return darkMode
    ? { r: 33, g: 32, b: 40 }
    : { r: 246, g: 246, b: 248 };
}

export function resolveShapeDepthMaxBlend(darkMode: boolean): number {
  return darkMode ? DEPTH_ALPHA_MAX_DARK : DEPTH_ALPHA_MAX_LIGHT;
}

function rowHeightDepthK(item: EngineFieldItem, gridMetrics: GridMetrics): number | null {
  const f = item.footprint;
  if (!f || gridMetrics.rowHeights.length < 1) return null;

  let minH = Infinity;
  let maxH = -Infinity;
  for (const h of gridMetrics.rowHeights) {
    if (h <= 0) continue;
    minH = Math.min(minH, h);
    maxH = Math.max(maxH, h);
  }

  if (!Number.isFinite(minH) || !Number.isFinite(maxH) || maxH <= minH) return null;

  const bottomRow = Math.max(0, Math.min(gridMetrics.rowHeights.length - 1, f.r0 + f.h - 1));
  const rowH = gridMetrics.rowHeights[bottomRow] ?? maxH;
  const nearK = clamp01((rowH - minH) / Math.max(1, maxH - minH));

  // In the horizon grid, small rows are far and large rows are near.
  return 1 - nearK;
}

function fallbackScreenDepthK(args: { p: PLike; item: EngineFieldItem; gridMetrics: GridMetrics }): number {
  const { p, item, gridMetrics } = args;
  const depth = item.y;
  const firstDepth = gridMetrics.rowOffsetY[0] ?? 0;
  const lastDepth = gridMetrics.rowOffsetY[gridMetrics.rowOffsetY.length - 1] ?? p.height;
  const depthK = clamp01((depth - firstDepth) / Math.max(1, lastDepth - firstDepth));
  return 1 - depthK;
}

export function resolveShapeDepthTint(args: {
  p: PLike;
  item: EngineFieldItem;
  gridMetrics?: GridMetrics;
  shapeAlpha?: number;
  darkMode?: boolean;
}): ShapeDepthTint | null {
  const { p, item, gridMetrics, shapeAlpha = 255, darkMode = false } = args;
  if (!gridMetrics || gridMetrics.rowOffsetY.length < 2) return null;

  const farK = rowHeightDepthK(item, gridMetrics) ?? fallbackScreenDepthK({ p, item, gridMetrics });
  const maxBlend = resolveShapeDepthMaxBlend(darkMode);
  // Keep the closest band visually clean, then ramp depth more quickly toward the horizon.
  const shapedFarK = clamp01((farK - DEPTH_FRONT_CLEAR_K) / (1 - DEPTH_FRONT_CLEAR_K));
  const blend = Math.pow(shapedFarK, DEPTH_ALPHA_CURVE) * maxBlend * clamp01(shapeAlpha / 255);
  if (blend <= 0) return null;

  return {
    color: resolveShapeDepthColor(darkMode),
    blend,
  };
}
