import type {
  BackgroundAnchorContext,
  LinearGradientSpec,
} from "../../../../scene-rules/backgrounds";
import type { PLike } from "../../../p/makeP";
import { clamp01 } from "../../../../shared/math";
import { resolveBackgroundStops } from "./anchors";
import {
  cssRgba,
  mixRgba,
  parseCssColor,
  resolveStopColor,
  type RGBA,
} from "../shared/color";

interface ResolvedSurfaceStop {
  k: number;
  left: RGBA;
  center?: RGBA; // present when leftRgba authored - rgba becomes center, leftRgba becomes left
  right: RGBA;
  blendFromPrevious: boolean;
  blendToNext: boolean;
  order: number;
}

function resolveStopRgba(
  rgba: string,
  liveBlend: number | readonly [number, number] | undefined,
  liveAvg: number
) {
  return parseCssColor(resolveStopColor(rgba, liveBlend, liveAvg));
}

function resolveSurfaceStops(
  spec: LinearGradientSpec,
  liveAvg: number,
  t: number,
  anchors?: BackgroundAnchorContext
): ResolvedSurfaceStop[] | null {
  const stops: ResolvedSurfaceStop[] = [];

  for (const resolved of resolveBackgroundStops(spec.stops, t, anchors)) {
    const { stop, k, order } = resolved;
    let leftSource = stop.rgba;
    let center: RGBA | undefined;
    if (stop.leftRgba) {
      leftSource = stop.leftRgba;
      center = resolveStopRgba(stop.rgba, stop.liveBlend, liveAvg) ?? undefined;
    }
    const left = resolveStopRgba(leftSource, stop.liveBlend, liveAvg);
    const right = resolveStopRgba(stop.rightRgba ?? stop.rgba, stop.liveBlend, liveAvg);
    if (!left || !right) return null;

    stops.push({
      k,
      left,
      center: center ?? undefined,
      right,
      blendFromPrevious: stop.blendFromPrevious !== false,
      blendToNext: stop.blendToNext !== false,
      order,
    });
  }

  return stops;
}

function drawSurfaceBand(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  bottom: number,
  left: RGBA,
  right: RGBA,
  center?: RGBA
) {
  const y0 = Math.max(0, Math.round(Math.min(top, bottom)));
  const y1 = Math.max(0, Math.round(Math.max(top, bottom)));
  if (y1 <= y0) return;

  const g = ctx.createLinearGradient(0, 0, width, 0);
  g.addColorStop(0, cssRgba(left));
  if (center) g.addColorStop(0.5, cssRgba(center));
  g.addColorStop(1, cssRgba(right));

  ctx.fillStyle = g;
  ctx.fillRect(0, y0, width, y1 - y0);
}

function drawBlendedSurfaceSegment(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  bottom: number,
  a: ResolvedSurfaceStop,
  b: ResolvedSurfaceStop
) {
  const h = bottom - top;
  if (h <= 0) return;

  const y0 = Math.max(0, Math.round(top));
  const y1 = Math.max(0, Math.round(bottom));
  const aCenter = a.center;
  const bCenter = b.center;
  for (let y = y0; y < y1; y += 1) {
    const localT = clamp01((y + 0.5 - top) / h);
    drawSurfaceBand(
      ctx,
      width,
      y,
      y + 1,
      mixRgba(a.left, b.left, localT),
      mixRgba(a.right, b.right, localT),
      aCenter && bCenter ? mixRgba(aCenter, bCenter, localT) : undefined
    );
  }
}

export function drawLinearStopSurface(
  p: PLike,
  ctx: CanvasRenderingContext2D,
  spec: LinearGradientSpec,
  alpha: number,
  liveAvg: number,
  t: number,
  anchors?: BackgroundAnchorContext
) {
  const stops = resolveSurfaceStops(spec, liveAvg, t, anchors);
  if (!stops) return false;

  ctx.save();
  ctx.globalAlpha = alpha;

  const first = stops[0];
  drawSurfaceBand(ctx, p.width, 0, first.k * p.height, first.left, first.right, first.center);

  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    const y0 = a.k * p.height;
    const y1 = b.k * p.height;
    if (y1 <= y0) continue;

    if (a.blendToNext && b.blendFromPrevious) {
      drawBlendedSurfaceSegment(ctx, p.width, y0, y1, a, b);
    } else {
      drawSurfaceBand(ctx, p.width, y0, y1, a.left, a.right, a.center);
    }
  }

  const last = stops[stops.length - 1];
  drawSurfaceBand(ctx, p.width, last.k * p.height, p.height, last.left, last.right, last.center);

  ctx.restore();
  return true;
}
