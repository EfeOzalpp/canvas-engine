import type {
  BackgroundAnchorContext,
  BackgroundStopK,
  RgbaStop,
} from "../../../../scene-rules/backgrounds";
import type { CanvasPaddingSpec } from "../../../../scene-rules/canvas-padding";
import type { GridMetrics } from "../../../geometry/gridCache";
import type { PLike } from "../../../p/makeP";
import { clamp01 } from "../../../../shared/math";
import { resolveHorizonRow } from "../shared/horizon";

function resolveAnchorK(anchor: Exclude<BackgroundStopK, number>, anchors?: BackgroundAnchorContext) {
  const baseK = anchors?.visualHorizonK;
  const resolvedBaseK = baseK ?? 0.5;
  const offset = typeof anchor === "string" ? 0 : anchor.offset ?? 0;
  return clamp01((Number.isFinite(resolvedBaseK) ? resolvedBaseK : 0.5) + offset);
}

export function resolveStopKValue(k: BackgroundStopK, anchors?: BackgroundAnchorContext) {
  return typeof k === "number" ? clamp01(k) : resolveAnchorK(k, anchors);
}

interface ResolvedBackgroundStop {
  stop: RgbaStop;
  k: number;
  order: number;
}

function resolveExplicitStopK(stop: RgbaStop, anchors?: BackgroundAnchorContext) {
  return stop.k === undefined ? null : resolveStopKValue(stop.k, anchors);
}

function applyStopOscillation(k: number, stop: RgbaStop, t: number) {
  return stop.oscK
    ? clamp01(k + stop.oscK.amp * Math.sin(2 * Math.PI * stop.oscK.hz * t))
    : clamp01(k);
}

export function resolveBackgroundStops(
  stops: readonly RgbaStop[],
  t: number,
  anchors?: BackgroundAnchorContext
): ResolvedBackgroundStop[] {
  if (stops.length === 0) return [];

  const resolved = stops.map((stop) => resolveExplicitStopK(stop, anchors));
  resolved[0] ??= 0;
  resolved[resolved.length - 1] ??= 1;

  for (let i = 0; i < resolved.length; i += 1) {
    if (resolved[i] !== null) continue;

    const startIndex = i - 1;
    let endIndex = i + 1;
    while (endIndex < resolved.length && resolved[endIndex] === null) {
      endIndex += 1;
    }

    const startK = startIndex >= 0 ? resolved[startIndex] ?? 0 : 0;
    const endK = endIndex < resolved.length ? resolved[endIndex] ?? 1 : 1;
    const span = Math.max(1, endIndex - startIndex);

    for (let j = i; j < endIndex; j += 1) {
      resolved[j] = clamp01(startK + (endK - startK) * ((j - startIndex) / span));
    }

    i = endIndex - 1;
  }

  return stops
    .map((stop, order) => ({
      stop,
      k: applyStopOscillation(resolved[order] ?? 0, stop, t),
      order,
    }))
    .sort((a, b) => a.k - b.k || a.order - b.order);
}

export function createBackgroundAnchorContext(args: {
  p: PLike;
  padding: CanvasPaddingSpec;
  metrics: GridMetrics;
}): BackgroundAnchorContext {
  const { p, padding, metrics } = args;
  const h = Math.max(1, p.height);
  const fallbackHorizonRow = resolveHorizonRow(metrics.rowHeights);
  const fallbackVisualY = metrics.rowOffsetY[fallbackHorizonRow] ?? h * 0.5;
  const visualHorizonK = clamp01(
    typeof padding.horizonPos === "number" ? padding.horizonPos : fallbackVisualY / h
  );

  return {
    visualHorizonK,
  };
}

export function backgroundAnchorCacheKey(anchors?: BackgroundAnchorContext) {
  if (!anchors) return "anchors:none";
  return `anchors:${anchors.visualHorizonK.toFixed(4)}`;
}
