import { clamp01, mixRgb } from "../../shared/math";
import type { RGB } from "../../shared/math";
import { footprintToPx } from "../projection";
import type { GridFootprint, PixelRect, ProjectionContext } from "../projection";

interface LightItem {
  x: number;
  y: number;
  footprint?: GridFootprint;
  paletteClosenessK?: number;
}

interface LightContextOpts extends ProjectionContext {
  lightItem: LightItem | null;
  darkMode: boolean;
  canvasW: number;
  canvasH: number;
}

export interface SceneLightContext {
  sourceX: number;
  sourceY: number;
  kind: "sun" | "moon";
  intensity: number;
  paletteClosenessK?: number;
  sceneW: number;
  sceneH: number;
  sceneDiag: number;
  lightColor: RGB;
  shadowColor: RGB;
}

export interface DirectionalLightSample {
  overallK: number;
  closenessK: number;
  leftK: number;
  rightK: number;
  topK: number;
  bottomK: number;
  xBias: number;
  yBias: number;
  lightColor: RGB;
  shadowColor: RGB;
}

export type LightClosenessBand = "far" | "mid" | "near";
export type LightClosenessBandMap<T> = Partial<Record<LightClosenessBand, T>>;

export interface LightBreakpoints {
  mid: number;
  near: number;
}

interface ShapeLightCanvas {
  CLOSE: unknown;
  push(): void;
  pop(): void;
  noStroke(): void;
  fill(r: number, g: number, b: number, a?: number): void;
  rect(x: number, y: number, w: number, h: number, ...radius: number[]): void;
  beginShape(): void;
  vertex(x: number, y: number): void;
  endShape(mode?: unknown): void;
}

interface PixelBandOptions {
  alpha: number;
  highlightColor: RGB;
  shadowColor: RGB;
  corner?: number;
  sideK?: number;
  topK?: number;
  shadowK?: number;
}

interface TriangleBand {
  leftX: number;
  rightX: number;
  baseY: number;
  apexX: number;
  apexY: number;
}

interface TriangleBandOptions {
  alpha: number;
  highlightColor: RGB;
  shadowColor: RGB;
}

const PIXEL_LIGHT_BAND_ALPHA_BOOST = 1.22;
const TRIANGLE_LIGHT_BAND_ALPHA_BOOST = 1.24;

const DEFAULT_LIGHT_CLOSENESS_BREAKPOINTS: LightBreakpoints = {
  mid: 0.52,
  near: 0.74,
};

function closenessDistanceScale(light: SceneLightContext): number {
  const aspect = light.sceneW / Math.max(1, light.sceneH);
  const tabletK = clamp01((1.75 - aspect) / 0.55);
  const aspectBoost = 1.08 + tabletK * 0.34;
  // On portrait viewports the canvas is taller than wide, so blend the base
  // toward sceneH to keep vertically-spread shapes out of the "far" band.
  const portraitK = clamp01(1 - aspect);
  const base = light.sceneW * (1 - portraitK) + light.sceneH * portraitK;
  const portraitBoost = 1 + portraitK * 1.1;
  return base * aspectBoost * portraitBoost;
}

export function lightClosenessBand(
  closenessK: number,
  breakpoints: LightBreakpoints = DEFAULT_LIGHT_CLOSENESS_BREAKPOINTS
): LightClosenessBand {
  const k = clamp01(closenessK);
  if (k >= clamp01(breakpoints.near)) return "near";
  if (k >= clamp01(breakpoints.mid)) return "mid";
  return "far";
}

export function pickLightBandValue<T>(
  base: T,
  byLight: LightClosenessBandMap<T> | undefined,
  closenessK: number,
  breakpoints: LightBreakpoints = DEFAULT_LIGHT_CLOSENESS_BREAKPOINTS
): T {
  const band = lightClosenessBand(closenessK, breakpoints);
  return byLight?.[band] ?? base;
}

function alphaByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function createSceneLightContext(opts: LightContextOpts): SceneLightContext | null {
  const { lightItem, darkMode, canvasW, canvasH, ...projection } = opts;
  if (!lightItem) return null;

  let sourceX = lightItem.x;
  let sourceY = lightItem.y;

  if (lightItem.footprint) {
    const { x, y, w, h } = footprintToPx(lightItem.footprint, projection);
    sourceX = x + w / 2;
    sourceY = y + h / 2;
  }

  return {
    sourceX,
    sourceY,
    kind: darkMode ? "moon" : "sun",
    intensity: darkMode ? 0.88 : 1.22,
    paletteClosenessK:
      typeof lightItem.paletteClosenessK === "number"
        ? clamp01(lightItem.paletteClosenessK)
        : undefined,
    sceneW: Math.max(1, canvasW),
    sceneH: Math.max(1, canvasH),
    sceneDiag: Math.max(1, Math.hypot(canvasW, canvasH)),
    lightColor: darkMode
      ? { r: 198, g: 220, b: 255 }
      : { r: 255, g: 222, b: 168 },
    shadowColor: darkMode
      ? { r: 58, g: 76, b: 108 }
      : { r: 88, g: 114, b: 150 },
  };
}

export function sampleDirectionalLightRect(
  rect: PixelRect,
  light: SceneLightContext | null
): DirectionalLightSample {
  if (!light) {
    return {
      overallK: 0,
      closenessK: 0,
      leftK: 0,
      rightK: 0,
      topK: 0,
      bottomK: 0,
      xBias: 0,
      yBias: 0,
      lightColor: { r: 255, g: 255, b: 255 },
      shadowColor: { r: 0, g: 0, b: 0 },
    };
  }

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = light.sourceX - cx;
  const dy = light.sourceY - cy;
  const dist = Math.max(1e-6, Math.hypot(dx, dy));
  const nx = dx / dist;
  const ny = dy / dist;
  const falloffK = clamp01(1 - dist / (light.sceneDiag * 1.75));
  const closenessK = typeof light.paletteClosenessK === "number"
    ? clamp01(light.paletteClosenessK)
    : clamp01(1 - dist / closenessDistanceScale(light));
  const overallK = Math.min(1.48, light.intensity * (0.96 + 0.22 * falloffK + 0.24 * falloffK * falloffK));
  const proximityHighlightK = Math.pow(closenessK, 1.35) * (light.kind === "moon" ? 0.18 : 0.24);
  const lightColor = mixRgb(light.lightColor, { r: 255, g: 255, b: 255 }, proximityHighlightK);

  return {
    overallK,
    closenessK,
    leftK: overallK * Math.max(0, -nx),
    rightK: overallK * Math.max(0, nx),
    topK: overallK * Math.max(0, -ny),
    bottomK: overallK * Math.max(0, ny),
    xBias: nx,
    yBias: ny,
    lightColor,
    shadowColor: light.shadowColor,
  };
}

// Paint helpers stay small on purpose. Shapes choose the art direction and pass
// us the already-sampled light strength.
export function paintPixelLightBands(
  p: ShapeLightCanvas | null | undefined,
  rect: PixelRect,
  light: DirectionalLightSample,
  opts: PixelBandOptions
): void {
  const { x, y, w, h } = rect;
  if (!p || w <= 0 || h <= 0) return;

  const sideLitK = Math.max(light.leftK, light.rightK);
  const sideW = Math.max(2, Math.round(w * 0.16));
  const sideX = light.leftK >= light.rightK ? x : x + w - sideW;
  const topH = Math.max(2, Math.round(h * 0.12));
  const shadowW = Math.max(2, Math.round(w * 0.12));
  const shadowX = light.leftK >= light.rightK ? x + w - shadowW : x;
  const corner = opts.corner ?? 0;
  const sideAlpha = alphaByte(opts.alpha * (opts.sideK ?? 0.48) * sideLitK * PIXEL_LIGHT_BAND_ALPHA_BOOST);
  const topAlpha = alphaByte(opts.alpha * (opts.topK ?? 0.34) * light.topK * PIXEL_LIGHT_BAND_ALPHA_BOOST);
  const shadowAlpha = alphaByte(opts.alpha * (opts.shadowK ?? 0.22) * sideLitK);

  p.noStroke();
  p.fill(opts.highlightColor.r, opts.highlightColor.g, opts.highlightColor.b, sideAlpha);
  p.rect(sideX, y + 1, sideW, Math.max(0, h - 2), Math.round(sideW * 0.35));

  p.fill(opts.highlightColor.r, opts.highlightColor.g, opts.highlightColor.b, topAlpha);
  p.rect(x + 1, y, Math.max(0, w - 2), topH, corner, corner, 0, 0);

  p.fill(opts.shadowColor.r, opts.shadowColor.g, opts.shadowColor.b, shadowAlpha);
  p.rect(shadowX, y + 1, shadowW, Math.max(0, h - 2), Math.round(shadowW * 0.35));
}

export function paintDirectionalTriangleBands(
  p: ShapeLightCanvas | null | undefined,
  tri: TriangleBand,
  light: DirectionalLightSample,
  opts: TriangleBandOptions
): void {
  if (!p) return;

  const { leftX, rightX, baseY, apexX, apexY } = tri;
  const { alpha, highlightColor, shadowColor } = opts;
  const width = Math.max(1, rightX - leftX);
  const litLeft = light.leftK >= light.rightK;
  const roofVisibleK = clamp01(1 - light.bottomK * 1.25);
  const litK = Math.max(light.leftK, light.rightK) * roofVisibleK;
  const centerX = leftX + width * 0.5;
  const litInnerX = litLeft ? leftX + width * 0.58 : rightX - width * 0.58;
  const shadowInnerX = litLeft ? rightX - width * 0.54 : leftX + width * 0.54;
  const topBaseInset = width * 0.18;
  const topApexY = apexY + Math.max(1, (baseY - apexY) * 0.18);
  const seamInsetY = Math.max(2, (baseY - apexY) * 0.18);
  const bandBaseY = baseY - seamInsetY;

  p.push();
  p.noStroke();

  p.fill(highlightColor.r, highlightColor.g, highlightColor.b, alphaByte(alpha * 0.42 * litK * TRIANGLE_LIGHT_BAND_ALPHA_BOOST));
  p.beginShape();
  p.vertex(apexX, apexY);
  p.vertex(litLeft ? leftX : rightX, bandBaseY);
  p.vertex(litInnerX, bandBaseY);
  p.endShape(p.CLOSE);

  p.fill(highlightColor.r, highlightColor.g, highlightColor.b, alphaByte(alpha * 0.34 * light.topK * roofVisibleK * TRIANGLE_LIGHT_BAND_ALPHA_BOOST));
  p.beginShape();
  p.vertex(leftX + topBaseInset, bandBaseY);
  p.vertex(rightX - topBaseInset, bandBaseY);
  p.vertex(centerX, topApexY);
  p.endShape(p.CLOSE);

  p.fill(shadowColor.r, shadowColor.g, shadowColor.b, alphaByte(alpha * 0.24 * litK));
  p.beginShape();
  p.vertex(apexX, apexY);
  p.vertex(litLeft ? rightX : leftX, bandBaseY);
  p.vertex(shadowInnerX, bandBaseY);
  p.endShape(p.CLOSE);

  p.pop();
}
