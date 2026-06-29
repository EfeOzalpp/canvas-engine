import type { EngineFieldItem } from "../../../../engine/field";
import type { RuntimeShapeOptions } from "../../../../shape-adapter/types";
import { finiteNumber } from "../../../../../shared/math";
import {
  shapeIdentity,
  shapePass,
  shapeProjection,
  shapeStyle,
} from "../../../../../shapes/options";

interface ShapeBitmapKeyBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LIVE_AVG_CACHE_STEPS = 20;

export function rounded(value: number | undefined, precision = 10) {
  return String(Math.round(finiteNumber(value, 0) * precision) / precision);
}

function footprintKey(item: EngineFieldItem) {
  const f = item.footprint;
  return f ? `${String(f.r0)},${String(f.c0)},${String(f.w)},${String(f.h)}` : "none";
}

export function rgbKey(rgb: NonNullable<RuntimeShapeOptions["style"]>["gradientRGB"]) {
  return rgb ? `${String(rgb.r)},${String(rgb.g)},${String(rgb.b)}` : "none";
}

export function liveAvgBucketId(liveAvg: number | undefined) {
  const raw = Math.round(finiteNumber(liveAvg, 0.5) * LIVE_AVG_CACHE_STEPS);
  return Math.max(0, Math.min(LIVE_AVG_CACHE_STEPS, raw));
}

export function liveAvgBucketAvg(liveAvg: number | undefined) {
  return liveAvgBucketId(liveAvg) / LIVE_AVG_CACHE_STEPS;
}

export function paletteKey(style: {
  gradientRGBOverrideActive?: boolean;
  gradientRGB?: NonNullable<RuntimeShapeOptions["style"]>["gradientRGB"];
  liveAvg?: number;
}) {
  if (style.gradientRGBOverrideActive) return `override:${rgbKey(style.gradientRGB)}`;
  return `avg:${String(liveAvgBucketId(style.liveAvg))}`;
}

function lightKey(light: NonNullable<RuntimeShapeOptions["style"]>["lightCtx"]) {
  return light
    ? `${rounded(light.sourceX)},${rounded(light.sourceY)},${rounded(light.sceneDiag)}`
    : "none";
}

function depthTintKey(opts: RuntimeShapeOptions) {
  const pass = shapePass(opts);
  const color = pass.depthTintColor;
  const colorPart = color ? `${String(color.r)},${String(color.g)},${String(color.b)}` : "none";
  return `${colorPart}:${rounded(pass.depthTintK, 100)}`;
}

export function shapeBitmapCacheKey(args: {
  item: EngineFieldItem;
  rEff: number;
  opts: RuntimeShapeOptions;
  bounds: ShapeBitmapKeyBounds;
  dpr: number;
}) {
  const { item, rEff, opts, bounds, dpr } = args;
  const projection = shapeProjection(opts);
  const style = shapeStyle(opts);
  const identity = shapeIdentity(opts);
  return [
    item.id,
    item.shape,
    footprintKey(item),
    rounded(rEff),
    rounded(projection.cell),
    rounded(projection.cellW),
    rounded(projection.cellH),
    String(identity.shapeOccurrenceIndex ?? 0),
    String(liveAvgBucketId(style.liveAvg)),
    String(style.darkMode ? 1 : 0),
    rounded(style.exposure),
    rounded(style.contrast),
    rounded(style.blend),
    paletteKey(style),
    depthTintKey(opts),
    lightKey(style.lightCtx),
    rounded(bounds.x),
    rounded(bounds.y),
    rounded(bounds.w),
    rounded(bounds.h),
    rounded(dpr, 100),
  ].join("|");
}

export function shapeBitmapFallbackKey(args: {
  item: EngineFieldItem;
  rEff: number;
  opts: RuntimeShapeOptions;
  bounds: ShapeBitmapKeyBounds;
  dpr: number;
}) {
  const { item, rEff, opts, bounds, dpr } = args;
  const projection = shapeProjection(opts);
  const style = shapeStyle(opts);
  const identity = shapeIdentity(opts);
  return [
    item.id,
    item.shape,
    footprintKey(item),
    rounded(rEff),
    rounded(projection.cell),
    rounded(projection.cellW),
    rounded(projection.cellH),
    String(identity.shapeOccurrenceIndex ?? 0),
    String(style.darkMode ? 1 : 0),
    rounded(style.exposure),
    rounded(style.contrast),
    rounded(style.blend),
    lightKey(style.lightCtx),
    rounded(bounds.x),
    rounded(bounds.y),
    rounded(bounds.w),
    rounded(bounds.h),
    rounded(dpr, 100),
  ].join("|");
}
