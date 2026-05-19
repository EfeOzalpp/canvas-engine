import type { SceneLightContext } from "../../../modifiers/lighting";
import { resolveFogHorizonRow } from "../../../shared/horizon";
import { clamp01 } from "../../../shared/math";
import { addAlphaOnlyLightStops } from "./color";
import type { GridMetrics } from "../../geometry/gridCache";
import { getCanvasMeta } from "../../p/canvasMeta";
import type { PLike } from "../../p/makeP";

interface FogColor { r: number; g: number; b: number }
interface FogGradientStop { k: number; color: FogColor }

const SKY_FOG_HORIZON_BLEND_BY_DISTANCE: readonly number[] = [0.8, 0.7, 0.6]; // 1 to 0 for how much to blend, and 3 properties for the three rows closest to the sky horizon.
const SKY_FOG_HORIZON_BLEND_CACHE_KEY = SKY_FOG_HORIZON_BLEND_BY_DISTANCE.join(",");
const SKY_LIGHT_INNER_RADIUS_K = 0.10;
const SKY_LIGHT_OUTER_RADIUS_K = 0.26;

export interface FogState {
  fogStartY: number;
  fogCanvasH: number;
  fogPeakRow: number;
  skyLayerAlpha: number;
  skyPeakOpacity: number;
  rowOffsetY: number[];
  bottomFogLayerBoundaries: number[];
  fogColor: FogColor;
  skyFogGradient: readonly FogGradientStop[] | null;
  groundFogGradient: readonly FogGradientStop[] | null;
  fogLayerAlpha255: number;
};

function remap01(v: number, start: number, end: number) {
  if (end <= start) return v >= end ? 1 : 0;
  return clamp01((v - start) / (end - start));
}

function mixFogColor(a: FogColor, b: FogColor, k: number): FogColor {
  const kk = clamp01(k);
  return {
    r: Math.round(a.r + (b.r - a.r) * kk),
    g: Math.round(a.g + (b.g - a.g) * kk),
    b: Math.round(a.b + (b.b - a.b) * kk),
  };
}

function rgbaString(color: FogColor, alpha: number) {
  return `rgba(${String(color.r)},${String(color.g)},${String(color.b)},${String(clamp01(alpha))})`;
}

function gradientCacheKey(gradientStops: readonly FogGradientStop[] | null | undefined) {
  if (!gradientStops || gradientStops.length === 0) return "none";
  return gradientStops
    .map((stop) => `${String(stop.k)}:${String(stop.color.r)},${String(stop.color.g)},${String(stop.color.b)}`)
    .join("|");
}

function fogOpacityScaleForRowCount(rowCount: number) {
  const referenceRows = 18;
  const rawScale = referenceRows / Math.max(1, rowCount);
  return Math.max(0.45, Math.min(1, rawScale));
}

function resolveFogFillStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  color: FogColor,
  alpha: number,
  gradientStops?: readonly FogGradientStop[] | null
) {
  if (!gradientStops || gradientStops.length === 0) {
    return rgbaString(color, alpha);
  }

  const g = ctx.createLinearGradient(0, 0, width, 0);
  for (const stop of gradientStops) {
    g.addColorStop(clamp01(stop.k), rgbaString(stop.color, alpha));
  }
  return g;
}

function blendGradientStopsTowardFog(
  stops: readonly FogGradientStop[],
  fogColor: FogColor,
  fogBlendK: number
): readonly FogGradientStop[] {
  return stops.map((stop) => ({
    k: stop.k,
    color: mixFogColor(stop.color, fogColor, fogBlendK),
  }));
}

function drawFogBand(args: {
  p: PLike;
  top: number;
  height: number;
  alpha255: number;
  overhangEdge: "top" | "bottom";
  color: FogColor;
  gradientStops?: readonly FogGradientStop[] | null;
  overhangPx?: number;
}) {
  const { p, top, height, alpha255, overhangEdge, color, gradientStops = null, overhangPx } = args;
  if (height <= 0 || alpha255 <= 0) return;

  const ctx = p.drawingContext;
  const alpha = Math.max(0, Math.min(1, alpha255 / 255));
  const outerFeather = overhangPx ?? (
    overhangEdge === "top"
      ? Math.max(18, Math.min(72, height * 0.6))
      : Math.max(10, Math.min(42, height * 0.35))
  );

  const fillFogRect = (rectTop: number, rectBottom: number) => {
    const y0 = Math.max(0, Math.round(rectTop));
    const y1 = Math.min(p.height, Math.round(rectBottom));
    if (y1 <= y0) return;

    ctx.save();
    ctx.fillStyle = resolveFogFillStyle(ctx, p.width, color, alpha, gradientStops);
    ctx.fillRect(0, y0, p.width, y1 - y0);
    ctx.restore();
  };

  if (overhangEdge === "bottom") {
    fillFogRect(top, top + height + outerFeather);
    return;
  }

  fillFogRect(top - outerFeather, top + height);
}

function skyFogTopOverhang(rowH: number) {
  return Math.max(4, Math.min(18, rowH * 0.35));
}

function skyFogHorizonBlendForRow(fogPeakRow: number, row: number) {
  const layersFromHorizon = fogPeakRow - 1 - row;
  return SKY_FOG_HORIZON_BLEND_BY_DISTANCE[layersFromHorizon] ?? 0;
}

function skyFogRowHeight(fog: FogState, row: number, rectTop: number) {
  const nextRowTop = row + 1 < fog.fogPeakRow
    ? fog.rowOffsetY[row + 1]
    : fog.fogStartY;
  return Math.max(0, nextRowTop - rectTop);
}

function skyFogGradientStopsForRow(fog: FogState, row: number) {
  if (!fog.skyFogGradient) return null;

  const horizonFogBlendK = skyFogHorizonBlendForRow(fog.fogPeakRow, row);
  return horizonFogBlendK > 0
    ? blendGradientStopsTowardFog(fog.skyFogGradient, fog.fogColor, horizonFogBlendK)
    : fog.skyFogGradient;
}

function drawSkyFogLayer(p: PLike, fog: FogState, row: number) {
  const rectTop = fog.rowOffsetY[row] ?? 0;
  const rectBottom = fog.fogStartY;
  const rectH = rectBottom - rectTop;
  if (rectH <= 0) return;

  const rowH = skyFogRowHeight(fog, row, rectTop);
  drawFogBand({
    p,
    top: rectTop,
    height: rectH,
    alpha255: Math.round(fog.skyLayerAlpha * 255),
    overhangEdge: "top",
    color: fog.fogColor,
    gradientStops: skyFogGradientStopsForRow(fog, row),
    overhangPx: skyFogTopOverhang(rowH),
  });
}

export function computeFogState(args: {
  p: PLike;
  metrics: GridMetrics;
  darkMode: boolean;
  isRealMobile: boolean;
  horizonPos?: number;
}): FogState | null {
  const { p, metrics, darkMode, isRealMobile, horizonPos } = args;
  if (metrics.rowHeights.length <= 2) return null;

  const fogPeakRow = resolveFogHorizonRow(metrics.rowHeights, horizonPos);
  const fogStartY = metrics.rowOffsetY[fogPeakRow];
  if (!Number.isFinite(fogStartY)) return null;

  const fogCanvasH = getCanvasMeta(p.canvas).cssH ?? p.height;
  const bottomFogLayerBoundaries = [
    ...metrics.rowOffsetY.slice(fogPeakRow + 1),
    fogCanvasH,
  ].filter((y) => Number.isFinite(y) && y > fogStartY);

  const rowCount = metrics.rowHeights.length;
  const fogOpacityScale = fogOpacityScaleForRowCount(rowCount);
  const baseFogLayerAlpha = darkMode ? 36 / 255 : 26 / 255;
  const FOG_LAYER_ALPHA = baseFogLayerAlpha * fogOpacityScale;
  const numBottomFogLayers = bottomFogLayerBoundaries.length;
  const targetHorizonOpacity = numBottomFogLayers > 0
    ? 1 - Math.pow(1 - FOG_LAYER_ALPHA, numBottomFogLayers)
    : 0;
  const numSkyFogLayers = Math.max(0, fogPeakRow);
  const skyLayerAlpha = numSkyFogLayers > 0
    ? 1 - Math.pow(1 - targetHorizonOpacity, 1 / numSkyFogLayers)
    : 0;
  const skyFogGradient = darkMode
    ? [
        ...(isRealMobile
          ? [
              { k: 0, color: { r: 55, g: 58, b: 72 } },
              { k: 0.06, color: { r: 68, g: 70, b: 88 } },
              { k: 0.19, color: { r: 68, g: 70, b: 88 } },
              { k: 0.64, color: { r: 28, g: 22, b: 42 } },
              { k: 1, color: { r: 14, g: 10, b: 32 } },
            ] as const
          : [
              { k: 0, color: { r: 55, g: 58, b: 72 } },
              { k: 0.06, color: { r: 68, g: 70, b: 88 } },
              { k: 0.19, color: { r: 68, g: 70, b: 88 } },
              { k: 0.64, color: { r: 28, g: 22, b: 42 } },
              { k: 1, color: { r: 14, g: 10, b: 32 } },
            ] as const),
      ] as const
    : null;
  const groundFogGradient = darkMode
    ? [
        ...(isRealMobile
          ? [
              { k: 0, color: { r: 52, g: 54, b: 54 } },
              { k: 0.16, color: { r: 72, g: 76, b: 86 } },
              { k: 0.22, color: { r: 72, g: 76, b: 86 } },
              { k: 0.74, color: { r: 30, g: 18, b: 30 } },
              { k: 1, color: { r: 15, g: 9, b: 30 } },
            ] as const
          : [
              { k: 0, color: { r: 52, g: 54, b: 54 } },
              { k: 0.16, color: { r: 72, g: 76, b: 86 } },
              { k: 0.22, color: { r: 72, g: 76, b: 86 } },
              { k: 0.74, color: { r: 30, g: 18, b: 30 } },
              { k: 1, color: { r: 15, g: 9, b: 30 } },
            ] as const),
      ] as const


    : null;

  return {
    fogStartY,
    fogCanvasH,
    fogPeakRow,
    skyLayerAlpha,
    skyPeakOpacity: targetHorizonOpacity,
    rowOffsetY: [...metrics.rowOffsetY],
    bottomFogLayerBoundaries,
    fogColor: darkMode
      ? (isRealMobile
          ? { r: 33, g: 32, b: 40 }
          : { r: 33, g: 32, b: 40 })
      : { r: 246, g: 246, b: 248 },
    skyFogGradient,
    groundFogGradient,
    fogLayerAlpha255: Math.round(FOG_LAYER_ALPHA * 255),
  };
}

export function createBottomFogStepper(p: PLike, fog: FogState) {
  let bottomFogLayerIndex = 0;
  const fogTopOffsetPx = 0;

  const drawNext = () => {
    const rectBottom = fog.bottomFogLayerBoundaries[bottomFogLayerIndex];
    if (!Number.isFinite(rectBottom)) return;
    const rectTop = fog.fogStartY + fogTopOffsetPx;
    const rectH = rectBottom - rectTop;
    const layerDepthT = fog.fogCanvasH > fog.fogStartY
      ? clamp01(rectH / (fog.fogCanvasH - fog.fogStartY))
      : 0;
    const gradientUseK = fog.groundFogGradient
      ? clamp01(Math.pow(remap01(layerDepthT, 0.30, 1), 1.36))
      : 0;
    const fogBlendK = 1 - gradientUseK;
    const gradientStops = fog.groundFogGradient
      ? blendGradientStopsTowardFog(fog.groundFogGradient, fog.fogColor, fogBlendK)
      : null;
    bottomFogLayerIndex += 1;
    if (rectH <= 0) return;
    drawFogBand({
      p,
      top: rectTop,
      height: rectH,
      alpha255: fog.fogLayerAlpha255,
      overhangEdge: "bottom",
      color: fog.fogColor,
      gradientStops,
    });
  };

  const drawUntilDepth = (depth: number) => {
    while (
      bottomFogLayerIndex < fog.bottomFogLayerBoundaries.length &&
      fog.bottomFogLayerBoundaries[bottomFogLayerIndex] <= depth
    ) {
      drawNext();
    }
  };

  const drawRemaining = () => {
    while (bottomFogLayerIndex < fog.bottomFogLayerBoundaries.length) {
      drawNext();
    }
  };

  return { drawNext, drawUntilDepth, drawRemaining };
}

// Offscreen cache for drawSkyFog — pure gradient geometry, no time dependency.
export function createSkyFogCache() {
  let offscreen: HTMLCanvasElement | null = null;
  let cacheKey = "";

  return function drawSkyFogCached(p: PLike, fog: FogState | null) {
    if (!fog || fog.skyLayerAlpha <= 0 || fog.fogPeakRow <= 0) return;

    const w = p.width;
    const h = p.height;
    const key = [
      String(w),
      String(h),
      fog.fogStartY.toFixed(1),
      String(fog.fogPeakRow),
      fog.skyLayerAlpha.toFixed(4),
      String(fog.fogColor.r),
      String(fog.fogColor.g),
      String(fog.fogColor.b),
      gradientCacheKey(fog.skyFogGradient),
      SKY_FOG_HORIZON_BLEND_CACHE_KEY,
      fog.rowOffsetY.join(","),
    ].join("|");

    if (offscreen?.width !== w || offscreen.height !== h) {
      offscreen ??= document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      cacheKey = "";
    }

    if (key !== cacheKey) {
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) throw new Error("2D canvas context not available");
      offCtx.clearRect(0, 0, w, h);
      const fakeP = { drawingContext: offCtx, width: w, height: h } as unknown as PLike;
      drawSkyFog(fakeP, fog);
      cacheKey = key;
    }

    const ctx = p.drawingContext;
    ctx.drawImage(offscreen, 0, 0);
  };
}

// Sky fog
export function drawSkyFog(p: PLike, fog: FogState) {
  if (fog.skyLayerAlpha <= 0 || fog.fogPeakRow <= 0) return;

  for (let r = 0; r < fog.fogPeakRow; r++) {
    drawSkyFogLayer(p, fog, r);
  }
}

// Sky light bands
export function drawSkyFogLightOverlay(args: {
  p: PLike;
  fog: FogState | null;
  light: SceneLightContext | null;
  alpha?: number;
}) {
  const { p, fog, light, alpha = 1 } = args;
  if (!fog || !light || alpha <= 0 || fog.skyLayerAlpha <= 0 || fog.fogPeakRow <= 0) return;

  const ctx = p.drawingContext;
  const sourceKx = clamp01(light.sourceX / Math.max(1, p.width));
  const maxBandH = Math.max(4, Math.min(22, p.height * 0.026));
  const fogPresenceK = clamp01(fog.skyLayerAlpha / 0.18);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "screen";

  for (let r = 0; r < fog.fogPeakRow; r += 1) {
    const rectTop = fog.rowOffsetY[r] ?? 0;
    const rectBottom = fog.fogStartY;
    const rectH = rectBottom - rectTop;
    if (rectH <= 0) continue;

    const rowH = skyFogRowHeight(fog, r, rectTop);
    const edgeLift = skyFogTopOverhang(rowH);
    const bandH = Math.max(3, Math.min(maxBandH, rowH * 0.20));
    const bandTop = Math.max(0, rectTop - edgeLift);
    const bandMidY = bandTop + bandH * 0.5;
    const distY = Math.abs(bandMidY - light.sourceY);
    const verticalK = clamp01(1 - distY / (p.height * 0.95));
    const horizonK = fog.fogPeakRow > 1 ? r / (fog.fogPeakRow - 1) : 1;
    const bandAlpha = 0.28 * verticalK * (0.72 + 0.28 * horizonK) * fogPresenceK;
    if (bandAlpha <= 0.003) continue;

    const g = ctx.createLinearGradient(0, 0, p.width, 0);
    addAlphaOnlyLightStops(g, sourceKx, bandAlpha, SKY_LIGHT_INNER_RADIUS_K, SKY_LIGHT_OUTER_RADIUS_K);

    ctx.fillStyle = g;
    ctx.fillRect(0, bandTop, p.width, bandH);
  }

  ctx.restore();
}
