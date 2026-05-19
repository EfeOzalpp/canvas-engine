// src/canvas-engine/shapes/bus.ts

import {
  applyShapeMods,
  blendRGB,
  clampBrightness,
  clampSaturation,
  clamp01,
  val,
  footprintToPx,
  sampleDirectionalLightRect,
  pickLightBandValue,
  mixRgb,
  paintPixelLightBands,
} from "../modifiers/index";
import type { LightClosenessBandMap, RGB } from "../modifiers/index";
import type { ShapeCanvas, ShapeDrawOptions, ShapePalette } from "./types";
import { applyExposureContrast, fillRgb } from "./shared/color";
import { beginFitScale, endFitScale, fitScaleToRectWidth } from "./shared/fit";
import { finiteNumber } from "./shared/numbers";
import { pick, pickByOccurrence, seeded01, shapeHash32 } from "./shared/random";

interface BusPalette extends ShapePalette {
  grass: RGB[];
  grassByLight?: LightClosenessBandMap<RGB[]>;
  asphalt: RGB;
  body: RGB[];
  window: RGB;
  wheel: RGB;
}

interface BusTuning {
  grass: { colorBlend: [number, number] };
  body: { colorBlend: [number, number] };
  asphalt: { min: [number, number]; max: [number, number] };
}

type BusDrawOptions = ShapeDrawOptions<BusPalette>;

// light mode
const BUS_BASE_PALETTE: BusPalette = {
  grass: [
    { r: 110, g: 160, b: 90 },
    { r: 130, g: 180, b: 110 },
    { r: 100, g: 150, b: 85 },
  ],
  asphalt: { r: 125, g: 125, b: 125 },
  body: [
    { r: 220, g: 136, b: 86 },
    { r: 232, g: 160, b: 102 },
    { r: 204, g: 118, b: 86 },
    { r: 224, g: 196, b: 118 },
    { r: 92, g: 158, b: 154 },
    { r: 132, g: 158, b: 204 },
    { r: 180, g: 92, b: 96 },
    { r: 198, g: 138, b: 154 },
    { r: 162, g: 182, b: 114 },
    { r: 154, g: 138, b: 204 },
    { r: 118, g: 172, b: 184 },
  ],
  window: { r: 180, g: 210, b: 235 },
  wheel: { r: 40, g: 40, b: 40 },
};

// dark mode
const BUS_DARK_PALETTE: BusPalette = {
  grass: [
    { r: 52, g: 96, b: 104 },
    { r: 58, g: 108, b: 114 },
    { r: 48, g: 90, b: 102 },
  ],
  grassByLight: {
    far: [
      { r: 76, g: 90, b: 92 },
      { r: 80, g: 96, b: 94 },
      { r: 70, g: 86, b: 92 },
    ],
    mid: [
      { r: 68, g: 96, b: 94 },
      { r: 72, g: 102, b: 96 },
      { r: 64, g: 90, b: 92 },
    ],
    near: [
      { r: 52, g: 96, b: 104 },
      { r: 58, g: 108, b: 114 },
      { r: 48, g: 90, b: 102 },
    ],
  },
  asphalt: { r: 68, g: 79, b: 96 },
  body: [
    { r: 188, g: 98, b: 68 },
    { r: 170, g: 92, b: 66 },
    { r: 188, g: 124, b: 88 },
    { r: 64, g: 128, b: 140 },
    { r: 76, g: 94, b: 152 },
    { r: 132, g: 132, b: 78 },
    { r: 158, g: 74, b: 102 },
    { r: 144, g: 102, b: 126 },
    { r: 116, g: 138, b: 96 },
    { r: 108, g: 118, b: 176 },
    { r: 78, g: 138, b: 150 },
    { r: 150, g: 100, b: 124 },
    { r: 92, g: 112, b: 164 },
    { r: 122, g: 104, b: 156 },
    { r: 94, g: 134, b: 136 },
    { r: 156, g: 124, b: 108 },
    { r: 112, g: 124, b: 148 },
  ],
  window: { r: 125, g: 135, b: 200 },
  wheel: { r: 45, g: 48, b: 58 },
};

// parameters
const BUS: BusTuning = {
  grass: { colorBlend: [0.16, 0.30] },
  body: { colorBlend: [0.06, 0.03] },
  asphalt: { min: [0.25, 0.32], max: [0.52, 0.65] },
};

/**
 * Draws a bus that scales on small/mobile tiles.
 * Variety is driven by opts.seedKey or tile footprint so texture caching will
 * not collapse every bus into the same color.
 */
export function drawBus(
  p: ShapeCanvas,
  cx: number,
  cy: number,
  r: number,
  opts: BusDrawOptions = {}
): void {
  const pal = opts.palette ?? (opts.darkMode ? BUS_DARK_PALETTE : BUS_BASE_PALETTE);
  const ex = finiteNumber(opts.exposure, 1);
  const ct = finiteNumber(opts.contrast, 1);
  const alpha = finiteNumber(opts.alpha, 235);
  const u = clamp01(opts.liveAvg ?? 0.5);

  const cell = opts.cell;
  const f = opts.footprint;
  let tileX: number;
  let tileY: number;
  let tileW: number;
  let tileH: number;
  let tileCx: number;

  if (cell && f) {
    ({ x: tileX, y: tileY, w: tileW, h: tileH } = footprintToPx(f, opts));
    tileCx = tileX + tileW / 2;
  } else {
    tileW = r * 6.4;
    tileH = r * 3.0;
    tileX = cx - tileW / 2;
    tileY = cy - tileH / 2;
    tileCx = cx;
  }

  const seedKey =
    (opts.seedKey ?? opts.seed)
    ?? (cell && f ? `bus|${String(f.r0)}:${String(f.c0)}|${String(f.w)}x${String(f.h)}` : `bus|${String(Math.round(cx))}|${String(Math.round(cy))}|${String(Math.round(r))}`);
  const occurrenceIndex = finiteNumber(opts.shapeOccurrenceIndex, 0);

  const r1 = seeded01(seedKey, "a");
  const r2 = seeded01(seedKey, "b");

  const baseY = tileY + tileH;
  const m = applyShapeMods({
    p,
    x: tileCx,
    y: baseY,
    r,
    opts: { alpha, timeMs: opts.timeMs, liveAvg: opts.liveAvg, rootAppearK: opts.rootAppearK },
    mods: {
      appear: { scaleFrom: 0.0, alphaFrom: 0.0, anchor: "bottom-center", ease: "back", backOvershoot: 1.25 },
      sizeOsc: { mode: "none" },
    },
  });

  p.push();
  p.translate(m.x, m.y);
  p.scale(m.scaleX, m.scaleY);
  p.translate(-tileCx, -baseY);

  const grassH = tileH * 0.50;
  const grassY = tileY + tileH - grassH;
  const aspH = grassH * 0.38;
  const aspY = grassY + (grassH - aspH) / 2;

  const grassLight = sampleDirectionalLightRect(
    { x: tileX, y: grassY, w: tileW, h: grassH },
    opts.lightCtx ?? null
  );
  const grassPalette = opts.darkMode
    ? pickLightBandValue(pal.grass, pal.grassByLight, grassLight.closenessK)
    : pal.grass;
  const g1 = pick(grassPalette, r1);
  const g2 = pick(grassPalette, r2);
  let grassTint = blendRGB(g1, g2, 0.4 + 0.3 * u);
  if (opts.gradientRGB) grassTint = blendRGB(grassTint, opts.gradientRGB, val(BUS.grass.colorBlend, u));
  if (opts.darkMode) {
    grassTint = clampSaturation(grassTint, 0.0, 0.22, 1);
    grassTint = clampBrightness(grassTint, 0.28, 0.42);
  }
  grassTint = applyExposureContrast(grassTint, ex, ct);
  if (opts.darkMode) {
    const grassLightK = grassLight.overallK * (0.03 + 0.08 * grassLight.closenessK);
    grassTint = mixRgb(grassTint, grassLight.lightColor, grassLightK);
  }

  p.noStroke();
  fillRgb(p, grassTint, alpha);
  p.rect(tileX, grassY, tileW, grassH, r * 0.18);

  let aspColor = applyExposureContrast(pal.asphalt, ex, ct);
  aspColor = clampBrightness(aspColor, val(BUS.asphalt.min, u), val(BUS.asphalt.max, u));
  fillRgb(p, aspColor, alpha);
  p.rect(tileX, aspY, tileW, aspH, r * 0.14);

  const wheelY = aspY + aspH * 0.25;
  const designW = r * 6.4;
  const sidePad = Math.max(2, tileW * 0.08);
  const s = fitScaleToRectWidth(designW, tileW, sidePad, { allowUpscale: opts.allowUpscale === true });

  const bodyOffset = shapeHash32(`${String(seedKey)}|body-offset`) % pal.body.length;
  let bodyTint = pickByOccurrence(pal.body, occurrenceIndex, bodyOffset);
  if (opts.gradientRGB) bodyTint = blendRGB(bodyTint, opts.gradientRGB, val(BUS.body.colorBlend, u));
  if (opts.darkMode) bodyTint = clampBrightness(bodyTint, 0.36, 0.66);
  bodyTint = applyExposureContrast(bodyTint, ex, ct);
  const winTint = applyExposureContrast(pal.window, ex, ct);

  beginFitScale(p, { cx: tileCx, anchorY: wheelY, scale: s });
  {
    const w = designW;
    const bodyH = r * 2.0;
    const busX = tileCx - w / 2;
    const bodyY = wheelY - bodyH * 1.00;
    const bodyLight = sampleDirectionalLightRect(
      { x: busX, y: bodyY, w, h: bodyH },
      opts.lightCtx ?? null
    );
    const litBodyTint = mixRgb(bodyTint, bodyLight.lightColor, 0.26 * bodyLight.overallK);
    const busHighlight = mixRgb(litBodyTint, bodyLight.lightColor, 0.46);
    const busShadow = mixRgb(litBodyTint, bodyLight.shadowColor, 0.28);

    const wheelD = Math.max(3, r * 0.85);
    fillRgb(p, pal.wheel, 255);
    p.circle(busX + w * 0.22, wheelY, wheelD);
    p.circle(busX + w * 0.38, wheelY, wheelD);
    p.circle(busX + w * 0.78, wheelY, wheelD);

    fillRgb(p, litBodyTint, 255);
    p.rect(busX, bodyY, w, bodyH, r * 0.22);
    paintPixelLightBands(p, { x: busX, y: bodyY, w, h: bodyH }, bodyLight, {
      alpha: 255,
      highlightColor: busHighlight,
      shadowColor: busShadow,
      corner: Math.round(r * 0.22),
      sideK: 0.40,
      topK: 0.24,
      shadowK: 0.16,
    });

    fillRgb(p, winTint, 255);
    const smallCount = 4;
    const gap = w * 0.02;
    const frontW = Math.max(w * 0.20, r * 2.4);
    const winH = bodyH * 0.42;
    const winY = bodyY + bodyH * 0.20;
    const usableForSmall = w - frontW - gap * (smallCount + 2);
    const smallW = Math.max(6, usableForSmall / smallCount);

    let wx = busX + gap;
    for (let i = 0; i < smallCount; i++) {
      p.rect(wx, winY, smallW, winH, r * 0.08);
      wx += smallW + gap;
    }

    const frontX = busX + w - frontW;
    const frontY = winY - Math.max(0, r * 0.02);
    p.rect(frontX, frontY, frontW, winH, r * 0.10, r * 0.30, 0, r * 0.08);
  }
  endFitScale(p);

  p.pop();
}

export default drawBus;
