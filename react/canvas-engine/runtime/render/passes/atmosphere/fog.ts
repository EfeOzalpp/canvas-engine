import { clamp01 } from "../../../../shared/math";
import type {
  FogColor,
  FogGradientStop,
  FogLightGradientSpec,
  FogSceneSpec,
} from "../../../../scene-rules/fog";
import type { GridMetrics } from "../../../geometry/gridCache";
import type { PLike } from "../../../p/makeP";
import { resolveHorizonRow } from "../shared/horizon";

// Frame-ready fog layout. The loop should not recalculate these row boundaries
// unless the grid or theme changes.
export interface FogState {
  isFlat: boolean;
  fogStartY: number;
  fogCanvasH: number;
  horizonRow: number;
  skyLayerAlpha: number;
  rowOffsetY: number[];
  groundFogLayerBoundaries: number[];
  fogColor: FogColor;
  skyFogGradient: readonly FogGradientStop[] | null;
  groundFogGradient: readonly FogGradientStop[] | null;
  fogLayerAlpha255: number;
}

interface FogStateInput {
  p: PLike;
  metrics: GridMetrics;
  darkMode: boolean;
  spec?: FogSceneSpec | null;
  lightSource?: FogLightSource | null;
  hasHorizon: boolean;
}

export interface FogLightSource {
  xK: number;
  color: FogColor;
}

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

export function gradientCacheKey(gradientStops: readonly FogGradientStop[] | null | undefined) {
  if (!gradientStops || gradientStops.length === 0) return "none";
  return gradientStops
    .map((stop) => `${String(stop.k)}:${String(stop.color.r)},${String(stop.color.g)},${String(stop.color.b)}`)
    .join("|");
}

function isLightGradientSpec(value: FogSceneSpec["sky"] extends infer Sky
  ? Sky extends { skyGradient?: infer G } ? G : never
  : never): value is FogLightGradientSpec {
  return Boolean(value && !Array.isArray(value));
}

function isFogGradientStops(
  value: FogLightGradientSpec | readonly FogGradientStop[]
): value is readonly FogGradientStop[] {
  return Array.isArray(value);
}

function resolveLightGradient(
  spec: FogLightGradientSpec,
  lightSource: FogLightSource,
  fallbackRadiusK?: number
): readonly FogGradientStop[] {
  const centerK = clamp01(lightSource.xK);
  const centerColor = lightSource.color;
  const innerRadiusK = Math.max(0.01, Math.min(0.5, fallbackRadiusK ?? spec.innerRadiusK ?? 0.13));
  // Natural fade width beyond the inner glow - fixed so the falloff looks the
  // same regardless of where the sun sits. When the sun is near an edge, the
  // outer fade extends past the viewport boundary; the boundary color is
  // computed by interpolating mid-fade rather than snapping to the edge color.
  const outerFadeWidth = Math.max(0.25, innerRadiusK * 2.5);
  const resolvedLeftEdgeColor = spec.leftEdgeColor ?? spec.edgeColor ?? centerColor;
  const resolvedRightEdgeColor = spec.rightEdgeColor ?? spec.edgeColor ?? centerColor;

  const colorAtK = (k: number): FogColor => {
    const dist = Math.abs(k - centerK);
    if (dist <= innerRadiusK) return centerColor;
    const edgeColor = k < centerK ? resolvedLeftEdgeColor : resolvedRightEdgeColor;
    const t = clamp01((dist - innerRadiusK) / outerFadeWidth);
    return mixFogColor(centerColor, edgeColor, t);
  };

  const stops: FogGradientStop[] = [{ k: 0, color: colorAtK(0) }];
  const leftInnerK = centerK - innerRadiusK;
  if (leftInnerK > 0 && leftInnerK < 1) stops.push({ k: leftInnerK, color: centerColor });
  stops.push({ k: centerK, color: centerColor });
  const rightInnerK = centerK + innerRadiusK;
  if (rightInnerK > 0 && rightInnerK < 1) stops.push({ k: rightInnerK, color: centerColor });
  stops.push({ k: 1, color: colorAtK(1) });

  return stops;
}

function defaultLightGradient(darkMode: boolean): FogLightGradientSpec {
  return darkMode
    ? {
        leftEdgeColor: { r: 55, g: 58, b: 72 },
        rightEdgeColor: { r: 14, g: 10, b: 32 },
        innerRadiusK: 0.13,
      }
    : {
        edgeColor: { r: 246, g: 246, b: 248 },
        innerRadiusK: 0.13,
      };
}

function resolveGradient(
  gradient: FogLightGradientSpec | readonly FogGradientStop[] | null | undefined,
  lightSource?: FogLightSource | null,
  fallbackRadiusK?: number,
  darkMode = false
): readonly FogGradientStop[] | null {
  if (!gradient) {
    return lightSource
      ? resolveLightGradient(defaultLightGradient(darkMode), lightSource, fallbackRadiusK)
      : null;
  }
  if (isFogGradientStops(gradient)) return gradient;
  if (isLightGradientSpec(gradient) && lightSource) {
    return resolveLightGradient(gradient, lightSource, fallbackRadiusK);
  }
  return null;
}

function fogOpacityScaleForRowCount(rowCount: number) {
  // More rows means more stacked fog bands, so each band needs less alpha.
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
  // Each fog slice overhangs slightly so row seams do not read as hard lines.
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

function skyFogRowHeight(fog: FogState, row: number, rectTop: number) {
  const nextRowTop = row + 1 < fog.horizonRow
    ? fog.rowOffsetY[row + 1]
    : fog.fogStartY;
  return Math.max(0, nextRowTop - rectTop);
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
    gradientStops: fog.skyFogGradient,
    overhangPx: skyFogTopOverhang(rowH),
  });
}

function computeFogState(args: {
  p: PLike;
  metrics: GridMetrics;
  darkMode: boolean;
  spec?: FogSceneSpec | null;
  lightSource?: FogLightSource | null;
  hasHorizon: boolean;
}): FogState | null {
  const { p, metrics, darkMode, spec, lightSource, hasHorizon } = args;
  if (metrics.rowHeights.length <= 2) return null;

  const fogColor = spec?.ground?.color ?? spec?.sky?.color ?? (darkMode ? { r: 33, g: 32, b: 40 } : { r: 246, g: 246, b: 248 });
  const baseFogLayerAlpha = spec?.ground?.layerAlpha ?? spec?.sky?.layerAlpha ?? (darkMode ? 44 / 255 : 26 / 255);

  if (!hasHorizon) {
    const flatFogLayerBoundaries = [
      ...metrics.rowOffsetY.slice(1),
      p.height,
    ].filter((y) => Number.isFinite(y) && y > 0);
    const flatGradient = resolveGradient(
      spec?.ground?.groundGradient ?? spec?.sky?.skyGradient,
      lightSource,
      spec?.lightRadiusK,
      darkMode
    );
    return {
      isFlat: true,
      fogStartY: 0,
      fogCanvasH: p.height,
      horizonRow: 0,
      skyLayerAlpha: 0,
      rowOffsetY: [],
      groundFogLayerBoundaries: flatFogLayerBoundaries,
      fogColor,
      skyFogGradient: null,
      groundFogGradient: flatGradient,
      fogLayerAlpha255: Math.round(baseFogLayerAlpha * 255),
    };
  }

  const horizonRow = resolveHorizonRow(metrics.rowHeights);
  const fogStartY = metrics.rowOffsetY[horizonRow];
  if (!Number.isFinite(fogStartY)) return null;

  // Ground fog still uses row boundaries, but it is one cached atmosphere pass.
  // Per-shape depth is handled by the depth mask overlay.
  const fogCanvasH = p.height;
  const groundFogLayerBoundaries = [
    ...metrics.rowOffsetY.slice(horizonRow + 1),
    fogCanvasH,
  ].filter((y) => Number.isFinite(y) && y > fogStartY);

  const rowCount = metrics.rowHeights.length;
  const fogOpacityScale = fogOpacityScaleForRowCount(rowCount);
  const fogLayerAlpha = baseFogLayerAlpha * fogOpacityScale;
  const numGroundFogLayers = groundFogLayerBoundaries.length;
  // Match sky opacity to the accumulated ground fog so the horizon stays soft.
  const targetHorizonOpacity = numGroundFogLayers > 0
    ? 1 - Math.pow(1 - fogLayerAlpha, numGroundFogLayers)
    : 0;
  const numSkyFogLayers = Math.max(0, horizonRow);
  const skyLayerAlpha = numSkyFogLayers > 0
    ? 1 - Math.pow(1 - targetHorizonOpacity, 1 / numSkyFogLayers)
    : 0;
  const skyFogGradient = resolveGradient(spec?.sky?.skyGradient, lightSource, spec?.lightRadiusK, darkMode);
  const groundFogGradient = resolveGradient(spec?.ground?.groundGradient, lightSource, spec?.lightRadiusK, darkMode);

  return {
    isFlat: false,
    fogStartY,
    fogCanvasH,
    horizonRow,
    skyLayerAlpha,
    rowOffsetY: [...metrics.rowOffsetY],
    groundFogLayerBoundaries,
    fogColor,
    skyFogGradient,
    groundFogGradient,
    fogLayerAlpha255: Math.round(fogLayerAlpha * 255),
  };
}

// Fog state is pure layout/color data, so this cache only invalidates on
// canvas, grid, or theme changes.
export function createFogStateCache() {
  let hasValue = false;
  let lastWidth = 0;
  let lastHeight = 0;
  let lastMetrics: GridMetrics | null = null;
  let lastDarkMode = false;
  let lastSpec: FogSceneSpec | null | undefined = undefined;
  let lastLightXK: number | null = null;
  let lastLightColorKey = "";
  let lastHasHorizon = false;
  let lastFog: FogState | null = null;

  return function getFogState(args: FogStateInput): FogState | null {
    const { p, metrics, darkMode, spec, lightSource } = args;
    const width = p.width;
    const height = p.height;
    const lightXK = lightSource?.xK ?? null;
    const lightColorKey = lightSource
      ? `${String(lightSource.color.r)},${String(lightSource.color.g)},${String(lightSource.color.b)}`
      : "";

    if (
      hasValue &&
      width === lastWidth &&
      height === lastHeight &&
      metrics === lastMetrics &&
      darkMode === lastDarkMode &&
      spec === lastSpec &&
      lightXK === lastLightXK &&
      lightColorKey === lastLightColorKey &&
      args.hasHorizon === lastHasHorizon
    ) {
      return lastFog;
    }

    lastWidth = width;
    lastHeight = height;
    lastMetrics = metrics;
    lastDarkMode = darkMode;
    lastSpec = spec;
    lastLightXK = lightXK;
    lastLightColorKey = lightColorKey;
    lastHasHorizon = args.hasHorizon;
    lastFog = computeFogState(args);
    hasValue = true;

    return lastFog;
  };
}

function drawGroundFog(p: PLike, fog: FogState) {
  for (const rectBottom of fog.groundFogLayerBoundaries) {
    if (!Number.isFinite(rectBottom)) return;
    const rectTop = fog.fogStartY;
    const rectH = rectBottom - rectTop;
    const layerDepthT = fog.fogCanvasH > fog.fogStartY
      ? clamp01(rectH / (fog.fogCanvasH - fog.fogStartY))
      : 0;
    // Deeper ground bands keep more of the scene gradient; near-horizon bands
    // blend harder into the fog color.
    const gradientUseK = fog.groundFogGradient
      ? clamp01(Math.pow(remap01(layerDepthT, 0.30, 1), 1.36))
      : 0;
    const fogBlendK = 1 - gradientUseK;
    const gradientStops = fog.groundFogGradient
      ? blendGradientStopsTowardFog(fog.groundFogGradient, fog.fogColor, fogBlendK)
      : null;
    if (rectH <= 0) continue;
    drawFogBand({
      p,
      top: rectTop,
      height: rectH,
      alpha255: fog.fogLayerAlpha255,
      overhangEdge: "bottom",
      color: fog.fogColor,
      gradientStops,
    });
  }
}

function drawFlatFog(p: PLike, fog: FogState) {
  drawFogBand({
    p,
    top: 0,
    height: p.height,
    alpha255: fog.fogLayerAlpha255,
    overhangEdge: "bottom",
    color: fog.fogColor,
    gradientStops: fog.groundFogGradient,
    overhangPx: 0,
  });
}

export function drawFogLayer(p: PLike, fog: FogState) {
  if (fog.isFlat) {
    drawFlatFog(p, fog);
    return;
  }

  drawSkyFog(p, fog);
  drawGroundFog(p, fog);
}

function drawSkyFog(p: PLike, fog: FogState) {
  if (fog.skyLayerAlpha <= 0 || fog.horizonRow <= 0) return;

  for (let r = 0; r < fog.horizonRow; r++) {
    drawSkyFogLayer(p, fog, r);
  }
}
