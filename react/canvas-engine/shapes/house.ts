// src/canvas-engine/shapes/house.ts

import {
  applySrgbExposureContrast,
  clamp01,
  resolveRangeValue,
  blendRGB,
  clampBrightness,
  oscillateBrightness,
  oscillateSaturation,
  driveSaturation,
  stepAndDrawPuffs,
  applyShapeMods,
  footprintToPx,
  particleBucketRange,
  particleDepthAlpha,
  particleDepthSizeScale,
  particleRowBucket,
  sampleDirectionalLightRect,
  pickLightBandValue,
  paintPixelLightBands,
  mixRgb,
  fillRgb,
  pick,
  pickByOccurrence,
  seededUnit as rand01,
  clampMinMax,
  shapeColorForRenderPass,
  shapeHash32 as hash32,
  shouldDrawInRenderPass,
} from "../modifiers/index";
import type { RGB, LightClosenessBandMap, NumberRange } from "../modifiers/index";
import type { ShapeCanvas, ShapeDrawOptions, ShapePalette, ShapeSeed } from "./types";
import {
  shapeIdentity,
  shapeLifecycle,
  shapeParticles,
  shapePass,
  shapeProjection,
  shapeSprite,
  shapeStyle,
} from "./options";

interface HousePalette extends ShapePalette {
  grass: RGB | RGB[];
  grassByLight?: LightClosenessBandMap<RGB | RGB[]>;
  body: RGB[];
  roof: RGB[];
  door: RGB[];
  window: {
    lit: RGB[];
    dark: RGB[];
  };
  solarPanel: RGB;
}

type HouseOptions = ShapeDrawOptions<HousePalette>;

type DoorProfileName = "short" | "mid" | "tall";
interface DoorProfile {
  W_FRAC: number;
  H_FRAC: number;
  Y_OFFSET_FRAC: number;
}

interface HouseTuning {
  body: { colorBlend: NumberRange; brightnessRange: NumberRange };
  grass: { colorBlend: NumberRange; satRange: NumberRange };
  chimney: { scaleRange: NumberRange };
  windows: { perFloor: number; size: NumberRange; marginY: number; thresholds: { low: number; mid: number } };
}

interface SmokeTuning {
  spawnX: NumberRange;
  spawnY: NumberRange;
  count: NumberRange;
  sizeMin: NumberRange;
  sizeMax: NumberRange;
  lifeMin: NumberRange;
  lifeMax: NumberRange;
  alpha: NumberRange;
  dir: "up";
  spreadAngle: NumberRange;
  speedMin: NumberRange;
  speedMax: NumberRange;
  gravity: NumberRange;
  drag: NumberRange;
  jitterPos: NumberRange;
  jitterAngle: NumberRange;
  fadeInFrac: number;
  fadeOutFrac: number;
  edgeFadePx: { left: number; right: number; top: number; bottom: number };
  sizeHz: number;
  base: RGB;
  blendK: NumberRange;
  satOscAmp: NumberRange;
  satOscSpeed: NumberRange;
  brightnessRange: NumberRange;
  colHk: number;
  offsetXFrac: number;
}

// Tunables.
const HOUSE: HouseTuning = {
  body: { colorBlend: [0.2, 0.02], brightnessRange: [0.45, 0.7] },
  grass: { colorBlend: [0.14, 0.28], satRange: [0.03, 0.14] },
  chimney: { scaleRange: [2, 0] },
  windows: { perFloor: 2, size: [10, 12], marginY: 12, thresholds: { low: 1.5, mid: 2.5 } }
};

const SMOKE: SmokeTuning = {
  spawnX: [0.5, 0.5],
  spawnY: [0.8, 0.8],
  count: [36, 22],
  sizeMin: [3, 0],
  sizeMax: [6, 1],
  lifeMin: [3, 3.8],
  lifeMax: [5.5, 6.8],
  alpha: [225, 0],
  dir: 'up',
  spreadAngle: [4, 0.26],
  speedMin: [4, 6],
  speedMax: [6, 9],
  gravity: [-10, -5],
  drag: [0.55, 0.72],
  jitterPos: [0.4, 1.2],
  jitterAngle: [0.06, 0.16],
  fadeInFrac: 0.22,
  fadeOutFrac: 0.38,
  edgeFadePx: { left: 2, right: 0, top: 2, bottom: 0 },
  sizeHz: 4,
  base: { r: 232, g: 235, b: 240 },
  blendK: [0.30, 0.10],
  satOscAmp: [0.04, 0.08],
  satOscSpeed: [0.12, 0.20],
  brightnessRange: [0.20, 0.95],
  colHk: 2.85,
  offsetXFrac: -0.04,
};

const WINDOW_OSC: {
  amp: NumberRange;
  speed: NumberRange;
  colorAmp: NumberRange;
  colorSpeed: NumberRange;
  brightnessMin: NumberRange;
  brightnessMax: NumberRange;
  litCurve: number;
} = {
  amp: [0.035, 0.085],
  speed: [0.18, 0.42],
  colorAmp: [0.05, 0.13],
  colorSpeed: [0.045, 0.095],
  brightnessMin: [0.54, 0.72],
  brightnessMax: [0.82, 0.96],
  litCurve: 0.92,
};

const WINDOW_COLOR_TARGETS: RGB[] = [
  { r: 255, g: 214, b: 122 },
  { r: 255, g: 232, b: 176 },
  { r: 255, g: 198, b: 104 },
  { r: 236, g: 242, b: 255 },
];

// Palettes.
const HOUSE_BASE_PALETTE: HousePalette = {
  grass: { r: 146, g: 188, b: 126 },
  body: [
    { r: 190, g: 212, b: 236 },
    { r: 230, g: 222, b: 202 },
    { r: 202, g: 228, b: 190 },
    { r: 236, g: 214, b: 228 },
    { r: 214, g: 238, b: 246 },
    { r: 202, g: 198, b: 222 },
    { r: 238, g: 228, b: 208 },
    { r: 208, g: 230, b: 216 },
    { r: 236, g: 214, b: 210 },
  ],
  roof: [
    { r: 220, g: 136, b: 116 },
    { r: 182, g: 136, b: 118 },
    { r: 160, g: 144, b: 138 },
    { r: 146, g: 132, b: 124 },
  ],
  door: [
    { r: 170, g: 120, b: 70 },
    { r: 150, g: 170, b: 90 },
    { r: 215, g: 190, b: 95 },
    { r: 180, g: 140, b: 100 },
  ],
  window: {
    lit: [
      { r: 255, g: 154, b: 64 },
      { r: 255, g: 176, b: 78 },
      { r: 255, g: 198, b: 96 },
      { r: 255, g: 222, b: 128 },
      { r: 255, g: 241, b: 176 },
    ],
    dark: [{ r: 120, g: 170, b: 220 }],
  },
  solarPanel: { r: 180, g: 205, b: 235 },
};

const HOUSE_DARK_PALETTE: HousePalette = {
  grass: { r: 56, g: 108, b: 116 },
  grassByLight: {
    far:  { r: 76, g: 94,  b: 94 },
    mid:  { r: 56, g: 108, b: 116 },
    near: { r: 52, g: 104, b: 132 },
  },
  body: [
    { r: 104, g: 130, b: 178 },
    { r: 118, g: 124, b: 172 },
    { r: 108, g: 146, b: 162 },
    { r: 128, g: 136, b: 178 },
    { r: 114, g: 148, b: 188 },
    { r: 158, g: 106, b: 162 },
    { r: 92,  g: 116, b: 152 },
    { r: 110, g: 142, b: 160 },
    { r: 136, g: 124, b: 166 },
    { r: 98,  g: 134, b: 170 },
    { r: 110, g: 132, b: 174 },
    { r: 152, g: 110, b: 162 },
    { r: 92,  g: 120, b: 160 },
  ],
  roof: [
    { r: 140, g: 86,  b: 104 },
    { r: 104, g: 106, b: 128 },
    { r: 88,  g: 108, b: 142 },
    { r: 114, g: 116, b: 150 },
    { r: 90,  g: 104, b: 142 },
  ],
  door: [
    { r: 93,  g: 76,  b: 74 },
    { r: 82,  g: 107, b: 89 },
    { r: 118, g: 120, b: 93 },
    { r: 99,  g: 88,  b: 87 },
  ],
  window: {
    lit:  [
      { r: 255, g: 146, b: 62 },
      { r: 255, g: 168, b: 76 },
      { r: 255, g: 190, b: 92 },
      { r: 255, g: 214, b: 120 },
      { r: 250, g: 234, b: 166 },
    ],
    dark: [
      { r: 96,  g: 105, b: 150 },
      { r: 105, g: 110, b: 160 },
      { r: 95,  g: 102, b: 170 },
      { r: 116, g: 128, b: 188 },
    ],
  },
  solarPanel: { r: 99, g: 129, b: 180 },
};

// Helpers.
function smokeRowContext(t: number) {
  return {
    size: particleBucketRange(t, 0.26, 1.0),
    motion: particleBucketRange(t, 0.18, 1.0),
    life: particleBucketRange(t, 1.28, 1.0),
    count: particleBucketRange(t, 0.52, 1.0),
    columnW: particleBucketRange(t, 0.62, 1.0),
    columnH: particleBucketRange(t, 0.9, 1.0),
  };
}

function oscillateWindowColor(base: RGB, timeSec: number, oscSeed: number): RGB {
  const targetR = rand01(oscSeed ^ 0x165667b1);
  const target = WINDOW_COLOR_TARGETS[Math.floor(targetR * WINDOW_COLOR_TARGETS.length) % WINDOW_COLOR_TARGETS.length];
  const amp = resolveRangeValue(WINDOW_OSC.colorAmp, rand01(oscSeed ^ 0xd3a2646c));
  const speed = resolveRangeValue(WINDOW_OSC.colorSpeed, rand01(oscSeed ^ 0xfd7046c5));
  const phase = rand01(oscSeed ^ 0xb55a4f09) * Math.PI * 2;
  const k = (0.5 + 0.5 * Math.sin(timeSec * Math.PI * 2 * speed + phase)) * amp;
  return mixRgb(base, target, k);
}
export function houseHasChimney(seedKey: ShapeSeed, liveAvg = 0.5): boolean {
  const u = clamp01(Number.isFinite(liveAvg) ? liveAvg : 0.5);
  if (u < 0.25) return true;
  if (u >= 0.75) return false;
  const seed = hash32(String(seedKey));
  const r4 = rand01(seed ^ 0x27d4eb2f);
  return Math.floor(r4 * 3) === 0;
}

export function drawHouse(
  p: ShapeCanvas,
  _cx: number,
  _cy: number,
  _r: number,
  opts: HouseOptions = {}
): void {
  const projection = shapeProjection(opts);
  const style = shapeStyle(opts);
  const lifecycle = shapeLifecycle(opts);
  const identity = shapeIdentity(opts);
  const sprite = shapeSprite(opts);
  const particles = shapeParticles(opts);
  const pass = shapePass(opts);
  const darkMode = style.darkMode === true;

  const pal = style.palette ?? (darkMode ? HOUSE_DARK_PALETTE
    : HOUSE_BASE_PALETTE);
  const cell = projection.cell;
  const f = projection.footprint;
  if (!cell || !f) return;
  const gradientRGB = style.gradientRGB ?? undefined;

  const isSprite = !!sprite.fitToFootprint || !!sprite.spriteMode;
  const spriteScale = Math.max(1, sprite.pixelScale ?? sprite.coreScaleMult ?? 1);

  const ex = typeof style.exposure === 'number' ? style.exposure : 1;
  const ct = typeof style.contrast === 'number' ? style.contrast : 1;

  const baseAlpha = typeof style.alpha === "number" && Number.isFinite(style.alpha) ? style.alpha : 255;
  const renderPass = pass.renderPass ?? "color";
  const maskColor = pass.maskColor;
  const requestedMaskAlpha =
    typeof pass.maskAlpha === "number" && Number.isFinite(pass.maskAlpha)
      ? pass.maskAlpha
      : baseAlpha;
  const shouldDrawColorDetails = shouldDrawInRenderPass(renderPass, false);
  const u = clamp01(style.liveAvg ?? 0.5);
  const t = ((typeof lifecycle.timeMs === 'number' ? lifecycle.timeMs : p.millis()) / 1000);
  const rowBucket = particleRowBucket(f, projection);
  const smokeScale = smokeRowContext(rowBucket.t);
  const particleSizeK = particleDepthSizeScale(rowBucket);

  const { x: pxX, y: pxY, w: pxW, h: pxH } = footprintToPx(f, projection);
  const localTileW = pxW / Math.max(1, f.w);
  const localTileH = pxH / Math.max(1, f.h);
  const localTile = Math.max(1, Math.min(localTileW, localTileH));
  const smallScale = localTile <= 8;

  // Root appear is the standard bottom-center envelope.
  const anchorX = pxX + pxW / 2;
  const anchorY = pxY + pxH;
  const m = applyShapeMods({
    p,
    x: anchorX,
    y: anchorY,
    r: Math.min(pxW, pxH),
    opts: {
      alpha: baseAlpha,
      timeMs: lifecycle.timeMs,
      rootAppearK: lifecycle.rootAppearK,
      selectK: lifecycle.selectK,
    },
  });

  const alpha = typeof m.alpha === 'number' ? m.alpha : baseAlpha;
  const appearAlphaK = baseAlpha > 0 ? clamp01(alpha / baseAlpha) : 1;
  const maskAlpha = renderPass === "depthMask"
    ? Math.round(requestedMaskAlpha * appearAlphaK)
    : alpha;
  const massAlpha = renderPass === "depthMask" ? maskAlpha : alpha;
  const shouldDrawMass = shouldDrawInRenderPass(renderPass, true);

  // Apply transform so the whole house scales around bottom-center
  p.push();
  p.translate(m.x, m.y);
  p.scale(m.scaleX, m.scaleY);
  p.translate(-anchorX, -anchorY);

  // grass
  const grassH = Math.max(1, Math.round(localTileH / 3));
  const grassY = pxY + pxH - grassH;
  const rGrassTop = Math.max(1, Math.round(localTile * 0.06));

  const grassSeed = rand01(hash32(`house-grass|${String(f.r0)}|${String(f.c0)}|${String(f.w)}x${String(f.h)}`));
  const grassLight = sampleDirectionalLightRect(
    { x: pxX, y: grassY, w: pxW, h: grassH },
    style.lightCtx ?? null
  );
  const grassBase = darkMode
    ? pickLightBandValue(pal.grass, pal.grassByLight, grassLight.closenessK)
    : pal.grass;
  let grassTint = pick(Array.isArray(grassBase) ? grassBase : [grassBase], grassSeed);
  const grassDriveU = Math.pow(u, 1.2);
  if (gradientRGB) {
    grassTint = blendRGB(grassTint, gradientRGB, resolveRangeValue(HOUSE.grass.colorBlend, grassDriveU));
  }
  grassTint = driveSaturation(grassTint, grassDriveU, HOUSE.grass.satRange[0], HOUSE.grass.satRange[1]);
  grassTint = darkMode
    ? clampBrightness(grassTint, 0.28, 0.42)
    : clampBrightness(grassTint, 0.50, 0.75);
  grassTint = applySrgbExposureContrast(grassTint, ex, ct);
  if (darkMode) {
    const grassLightK = grassLight.overallK * (0.05 + 0.12 * grassLight.closenessK);
    grassTint = mixRgb(grassTint, grassLight.lightColor, grassLightK);
  }

  // The depth mask pass paints only stable mass: grass, house body, roof, and chimney.
  // Smoke, panels, doors, and windows stay color-only so they do not stack depth alpha.
  if (shouldDrawMass) {
    p.noStroke();
    fillRgb(p, shapeColorForRenderPass(renderPass, grassTint, maskColor), massAlpha);
    p.rect(pxX, grassY, pxW, grassH, rGrassTop, rGrassTop, 0, 0);
  }

  // body + roof
  const availH = Math.max(3, grassY - pxY);
  const seedKey = (identity.seedKey ?? identity.seed) ?? `house|${String(f.r0)}|${String(f.c0)}|${String(f.w)}x${String(f.h)}`;
  const occurrenceIndex = typeof identity.shapeOccurrenceIndex === "number" && Number.isFinite(identity.shapeOccurrenceIndex) ? identity.shapeOccurrenceIndex : 0;
  const seed = hash32(String(seedKey));
  const r1 = rand01(seed ^ 0x9e3779b9);
  const r3 = rand01(seed ^ 0xc2b2ae35);
  const r4 = rand01(seed ^ 0x27d4eb2f);
  const r5 = rand01(seed ^ 0xa2bfe8a1);
  const r6 = rand01(seed ^ 0x3c6ef372); // panels: presence/count
  const r7 = rand01(seed ^ 0xbb67ae85); // panels: orientation
  const r8 = rand01(seed ^ 0x1f83d9ab); // panels: side

  const desiredBodyH = Math.round(availH * (0.5 + 0.4 * r1));
  const roofHRaw = Math.round(localTileH * 0.10);
  const roofH = clampMinMax(
    roofHRaw,
    smallScale ? 1 : 2,
    Math.max(1, Math.floor(availH * 0.20))
  );
  const minBodyH = smallScale
    ? Math.max(2, Math.round(localTileH * 0.9))
    : Math.max(5, Math.round(localTileH * 1.1));
  const maxBodyH = Math.max(1, availH - roofH);
  const bodyH = clampMinMax(desiredBodyH, Math.min(minBodyH, maxBodyH), maxBodyH);
  const bodyY = grassY - bodyH;
  const roofY = Math.max(pxY, bodyY - roofH);

  const bodyOffset = seed % pal.body.length;
  let bodyTint = pickByOccurrence(pal.body, occurrenceIndex, bodyOffset);
  if (gradientRGB) {
    bodyTint = blendRGB(bodyTint, gradientRGB, resolveRangeValue(HOUSE.body.colorBlend, u));
  }
  bodyTint = clampBrightness(bodyTint, HOUSE.body.brightnessRange[0], HOUSE.body.brightnessRange[1]);
  bodyTint = applySrgbExposureContrast(bodyTint, ex, ct);

  const roofTintRaw = pick(pal.roof, r3);
  let roofTint = applySrgbExposureContrast(roofTintRaw, ex, ct);
  const buildingLight = sampleDirectionalLightRect(
    { x: pxX, y: roofY, w: pxW, h: Math.max(1, grassY - roofY) },
    style.lightCtx ?? null
  );
  bodyTint = mixRgb(bodyTint, buildingLight.lightColor, 0.24 * buildingLight.overallK);
  roofTint = mixRgb(roofTint, buildingLight.lightColor, 0.18 * buildingLight.overallK);
  const rBody = Math.max(1, Math.round(localTile * 0.06));

  if (shouldDrawMass) {
    p.noStroke();
    fillRgb(p, shapeColorForRenderPass(renderPass, bodyTint, maskColor), renderPass === "depthMask" ? maskAlpha : 255);
    p.rect(pxX, bodyY, pxW, bodyH, rBody);
  }
  if (shouldDrawColorDetails) {
    paintPixelLightBands(
      p,
      { x: pxX, y: bodyY, w: pxW, h: bodyH },
      buildingLight,
      {
        alpha: 255,
        highlightColor: mixRgb(bodyTint, buildingLight.lightColor, 0.52),
        shadowColor: mixRgb(bodyTint, buildingLight.shadowColor, 0.30),
        corner: rBody,
        sideK: 0.42,
        topK: 0.0,
        shadowK: 0.18,
      }
    );
  }

  if (shouldDrawMass) {
    fillRgb(p, shapeColorForRenderPass(renderPass, roofTint, maskColor), massAlpha);
    p.rect(pxX, roofY, pxW, roofH, rBody, rBody, 0, 0);
  }
  if (shouldDrawColorDetails) {
    paintPixelLightBands(
      p,
      { x: pxX, y: roofY, w: pxW, h: roofH },
      buildingLight,
      {
        alpha,
        highlightColor: mixRgb(roofTint, buildingLight.lightColor, 0.44),
        shadowColor: mixRgb(roofTint, buildingLight.shadowColor, 0.24),
        corner: rBody,
        sideK: 0.28,
        topK: 0.18,
        shadowK: 0.12,
      }
    );
  }

  // --- Solar panels (bigger, slightly above roof top line, side-linked tilt)
  if (shouldDrawColorDetails) {
    const hasPanels = Math.floor(r6 * 3) !== 0; // ~2/3 of houses
    const vis = Math.max(0, Math.min(1, (u - 0.80) / 0.20));
    const tinyRoof = localTile <= 8 || pxW < 18 || roofH < 3;
    const compactRoof = !tinyRoof && (localTile <= 11 || pxW < 24 || roofH < 5);
    const allowPanels = !tinyRoof;
    if (hasPanels && vis > 0 && allowPanels) {
      // determine which side of the roof they go on
      const chimneyExists = houseHasChimney(seedKey, u);
      const chimneyLeft = chimneyExists ? (r4 < 0.5) : null;

      let sideLeft = r8 < 0.5;
      if (chimneyExists && ((chimneyLeft && sideLeft) || (!chimneyLeft && !sideLeft))) {
        sideLeft = !sideLeft; // avoid chimney side
      }

      // link tilt angle to side (+/-30deg)
      const angle = compactRoof ? 0 : (sideLeft ? -1 : 1) * (Math.PI / 6);

      // slightly bigger base sizes than before
      const basePW = compactRoof
        ? Math.max(7, Math.round(pxW * 0.26))
        : Math.max(smallScale ? 5 : 10, Math.round(pxW * 0.18));
      const basePH = compactRoof
        ? Math.max(2, Math.round(roofH * 0.55))
        : Math.max(smallScale ? 2 : 5, Math.round(roofH * 0.65));
      const s = 0.7 + 0.4 * vis; // [0.7..1.1]
      let pW = basePW * s;
      let pH = basePH * s;

      // screen-space safe clamp
      const marginSide = Math.max(compactRoof ? 2 : (smallScale ? 1 : 4), pxW * 0.08);
      const halfW = pxW / 2;
      const sideW = halfW - marginSide;

      // 2 or 3 panels
      const panelCount = compactRoof ? 1 : 2 + (r6 < 0.33 ? 1 : 0);

      // limit width to side span
      const maxPW = Math.max(smallScale ? 4 : 8, (sideW / panelCount) * 0.95);
      pW = Math.min(pW, maxPW);

      // height clamp so they don't dwarf small roofs
      pH = Math.min(pH, Math.max(compactRoof ? 2 : (smallScale ? 2 : 6), roofH * 0.9));

      // Y: slightly above the roof top line (roofY is the top edge)
      const yOnRoof = compactRoof
        ? roofY + Math.max(1, roofH * 0.28)
        : roofY - Math.max(2, roofH * 0.6);

      // X: pack on chosen side
      let startX;
      const spacing = compactRoof ? 0 : pW * 0.2;
      if (sideLeft) {
        startX = pxX + marginSide + pW / 2;
      } else {
        startX = pxX + pxW - marginSide - pW / 2 - (panelCount - 1) * (pW + spacing);
      }

      // color & draw (no external gradient blend for panels)
      let panelTint = pal.solarPanel;
      panelTint = applySrgbExposureContrast(panelTint, ex, ct);

      p.push();
      p.rectMode(p.CENTER);
      p.noStroke();
      fillRgb(p, panelTint, Math.round(alpha * vis));

      for (let i = 0; i < panelCount; i++) {
        const jitter = compactRoof ? 0 : ((i === 0) ? 0 : ((r7 * 2 - 1) * pW * 0.06));
        const cx = startX + i * (pW + spacing) + jitter;
        const cy = compactRoof
          ? yOnRoof
          : yOnRoof - (r8 * 2 - 1) * Math.min(3, roofH * 0.06);

        p.push();
        p.translate(cx, cy);
        p.rotate(angle);
        p.rect(0, 0, pW, pH, Math.round(Math.min(pW, pH) * 0.12));
        p.pop();

        if (!compactRoof) {
          // subtle highlight stripe
          p.push();
          p.translate(cx, cy);
          p.rotate(angle);
          const hi = {
            r: Math.min(255, panelTint.r + 22),
            g: Math.min(255, panelTint.g + 22),
            b: Math.min(255, panelTint.b + 22)
          };
          fillRgb(p, hi, Math.round(alpha * vis * 0.35));
          p.rect(-pW * 0.18, -pH * 0.06, pW * 0.70, pH * 0.10, Math.round(Math.min(pW, pH) * 0.12));
          p.pop();
        }
      }
      p.pop();
    }
  }
  // --- end solar panels ---

  // chimney (~1 in 3)
  if (houseHasChimney(seedKey, u)) {
    const baseW = Math.max(1, Math.round(pxW * 0.18));
    const baseH = Math.max(1, Math.round(bodyH * 0.075));
    const scale = resolveRangeValue(HOUSE.chimney.scaleRange, u) * particleBucketRange(rowBucket.t, 0.52, 1.0);
    const cW = clampMinMax(baseW * scale, 1, Math.max(1, Math.round(pxW * 0.28)));
    const cH = clampMinMax(baseH * scale, 1, Math.max(1, Math.round(bodyH * 0.22)));

    const onLeft = r4 < 0.5;
    const margin = Math.max(1, pxW * 0.1);
    const cx = onLeft ? pxX + margin : pxX + pxW - margin - cW;
    const cy = roofY;

    // smoke behind chimney
    if (shouldDrawColorDetails) {
      const smokeColW = Math.max(2, Math.round(Math.max(cW, localTileW * 0.18) * smokeScale.columnW));
      const smokeColH = Math.max(
        Math.round(localTileH * 1.6),
        Math.round(localTileH * SMOKE.colHk * smokeScale.columnH)
      );
      const smokeX =
        cx +
        cW / 2 -
        smokeColW / 2 +
        Math.round(smokeColW * SMOKE.offsetXFrac);
      const smokeY = cy - cH - smokeColH + Math.round(localTileH * 0.46);
      const bottomFadePx = isSprite ? Math.max(0, Math.round(smokeColH - localTileH * 0.7)) : 0;

      const spawnX0 = Math.min(resolveRangeValue(SMOKE.spawnX, 0), resolveRangeValue(SMOKE.spawnX, u));
      const spawnX1 = Math.max(resolveRangeValue(SMOKE.spawnX, u), 1 - (1 - resolveRangeValue(SMOKE.spawnX, u)));
      const spawnY0 = Math.min(resolveRangeValue(SMOKE.spawnY, 0), resolveRangeValue(SMOKE.spawnY, u));
      const spawnY1 = Math.max(resolveRangeValue(SMOKE.spawnY, u), 1 - (1 - resolveRangeValue(SMOKE.spawnY, u)));

      const count     = Math.max(4, Math.floor(resolveRangeValue(SMOKE.count, u) * smokeScale.count));
      const sizeMin   = resolveRangeValue(SMOKE.sizeMin, u) * smokeScale.size * particleSizeK * spriteScale;
      const sizeMax   = Math.max(sizeMin, resolveRangeValue(SMOKE.sizeMax, u) * smokeScale.size * particleSizeK * spriteScale);
      const lifeMin   = Math.max(0.05, resolveRangeValue(SMOKE.lifeMin, u) * smokeScale.life);
      const lifeMax   = Math.max(lifeMin, resolveRangeValue(SMOKE.lifeMax, u) * smokeScale.life);
      const sAlpha    = Math.max(0, Math.min(255, Math.round(resolveRangeValue(SMOKE.alpha, u))));

      const speedMin  = resolveRangeValue(SMOKE.speedMin, u) * smokeScale.motion;
      const speedMax  = Math.max(speedMin, resolveRangeValue(SMOKE.speedMax, u) * smokeScale.motion);
      const gravity   = resolveRangeValue(SMOKE.gravity, u) * smokeScale.motion;
      const drag      = resolveRangeValue(SMOKE.drag, u);
      const jPos      = resolveRangeValue(SMOKE.jitterPos, u) * smokeScale.size;
      const jAng      = resolveRangeValue(SMOKE.jitterAngle, u);
      const spreadAng = resolveRangeValue(SMOKE.spreadAngle, u);

      const blendK    = resolveRangeValue(SMOKE.blendK, u);
      const satAmp    = resolveRangeValue(SMOKE.satOscAmp, u);
      const satSpd    = resolveRangeValue(SMOKE.satOscSpeed, u);

      const baseSmoke = gradientRGB
        ? blendRGB(SMOKE.base, gradientRGB, blendK)
        : SMOKE.base;

      let smoked = oscillateSaturation(baseSmoke, t, { amp: satAmp, speed: satSpd, phase: 0 });
      smoked = clampBrightness(smoked, SMOKE.brightnessRange[0], SMOKE.brightnessRange[1]);
      smoked = applySrgbExposureContrast(smoked, ex, ct);

      const smokeColor = { r: smoked.r, g: smoked.g, b: smoked.b, a: sAlpha };
      const dt = Math.max(0.001, (p.deltaTime || 16) / 1000);

      stepAndDrawPuffs(p, {
        store: particles.particleStore,
        key: `chimney-smoke:${String(f.r0)}:${String(f.c0)}:${String(f.w)}x${String(f.h)}:${String(seedKey)}`,
        rect: { x: smokeX, y: smokeY, w: smokeColW, h: smokeColH },
        dir: SMOKE.dir,
        spreadAngle: spreadAng,
        speed: { min: speedMin, max: speedMax },
        gravity,
        drag,
        accel: { x: 0, y: 0 },

        spawn: { x0: spawnX0, x1: spawnX1, y0: spawnY0, y1: spawnY1 },
        jitter: { pos: jPos, velAngle: jAng },

        count,
        size: { min: sizeMin, max: sizeMax },
        sizeHz: SMOKE.sizeHz,

        lifetime: { min: lifeMin, max: lifeMax },
        fadeInFrac: SMOKE.fadeInFrac,
        fadeOutFrac: SMOKE.fadeOutFrac,
        edgeFadePx: { ...SMOKE.edgeFadePx, bottom: bottomFadePx },

        color: smokeColor,
        depthAlpha: particleDepthAlpha(rowBucket),
        respawn: true,
      }, dt);
    }

    // chimney on top
    fillRgb(p, shapeColorForRenderPass(renderPass, bodyTint, maskColor), massAlpha);
    p.rectMode(p.CORNER);
    p.rect(cx, cy - cH, cW, cH);
  }

// ------- Door (3 profiles: short / mid / tall) -------
if (shouldDrawColorDetails) {
  let doorTint = pick(pal.door, r5);
  if (gradientRGB) {
    doorTint = blendRGB(doorTint, gradientRGB, resolveRangeValue(HOUSE.body.colorBlend, u));
  }
  doorTint = applySrgbExposureContrast(doorTint, ex, ct);

  // Choose profile by building height (in cells)
  const cellsH = f.h;
  const low = HOUSE.windows.thresholds.low;
  const mid = HOUSE.windows.thresholds.mid;
  let profile: DoorProfileName = 'short';
  if (cellsH >= low) profile = 'mid';
  if (cellsH > mid)  profile = 'tall';

  // Per-profile tuning
  const DOOR_PROFILES: Record<DoorProfileName, DoorProfile> = {
    short: { W_FRAC: 0.18, H_FRAC: 0.20, Y_OFFSET_FRAC: 0.00 },
    mid:   { W_FRAC: 0.18, H_FRAC: 0.18, Y_OFFSET_FRAC: 0.00 },
    tall:  { W_FRAC: 0.18, H_FRAC: 0.14, Y_OFFSET_FRAC: -0.02 },
  };

  const cfg = DOOR_PROFILES[profile];

  // Fractions of body size
  const doorW = Math.max(smallScale ? 2 : 3, Math.round(pxW * cfg.W_FRAC));
  const doorH = Math.max(smallScale ? 3 : 6, Math.round(bodyH * cfg.H_FRAC));

  const doorX = pxX + (pxW - doorW) / 2;
  const doorDrop = Math.max(1, Math.round(bodyH * 0.035));
  const doorY = bodyY + bodyH - doorH + Math.round(bodyH * cfg.Y_OFFSET_FRAC) + doorDrop;

  fillRgb(p, doorTint, alpha);
  p.rect(doorX, doorY, doorW, doorH, Math.round(cell * 0.03));
}

// ------- Windows (short / mid / compact-tall / tall; 2 per row; max 8) -------
if (shouldDrawColorDetails) {
  // lit/dark tints (safe)
  let winLitVariants = Array.isArray(pal.window.lit) ? pal.window.lit : [pal.window.lit];
  let winDarkVariants = [...pal.window.dark];
  if (gradientRGB) {
    const k = resolveRangeValue(HOUSE.body.colorBlend, u);
    winLitVariants = winLitVariants.map((c) => blendRGB(c, gradientRGB, k));
    winDarkVariants = winDarkVariants.map((c) => blendRGB(c, gradientRGB, k));
  }
    winLitVariants = winLitVariants.map((c) => {
      let toned = c;
      if (!darkMode) {
        toned = driveSaturation(toned, 0.4, 0.24, 0.34);
        toned = clampBrightness(toned, 0.66, 0.9);
      }
      return applySrgbExposureContrast(toned, ex, ct);
    });
  winDarkVariants = winDarkVariants.map((c) => applySrgbExposureContrast(c, ex, ct));

  const cellsH = f.h;
  const low = HOUSE.windows.thresholds.low;
  const mid = HOUSE.windows.thresholds.mid;

  const PROFILES = {
    // Short keeps cottage scale; mid is the shorter apartment-style house.
    short: { rows: 1, WIN_W_FRAC: 0.12, WIN_H_FRAC: 0.34, H_GAP_FRAC: 0.16, V_GAP_FRAC: 0.06, TOP_FRAC: 0.20, BOT_FRAC: 0.34 },
    mid:   { rows: 3, WIN_W_FRAC: 0.16, WIN_H_FRAC: 0.105, H_GAP_FRAC: 0.12, V_GAP_FRAC: 0.09, TOP_FRAC: 0.13, BOT_FRAC: 0.24 },
    compactTall: { rows: 3, WIN_W_FRAC: 0.16, WIN_H_FRAC: 0.105, H_GAP_FRAC: 0.12, V_GAP_FRAC: 0.10, TOP_FRAC: 0.13, BOT_FRAC: 0.25 },
    tall:  { rows: 4, WIN_W_FRAC: 0.16, WIN_H_FRAC: 0.078, H_GAP_FRAC: 0.12, V_GAP_FRAC: 0.085, TOP_FRAC: 0.11, BOT_FRAC: 0.22 },
  };

  const bodyTileRows = bodyH / Math.max(1, localTileH);
  const usesTallWindowStack = cellsH > mid && bodyTileRows >= 2.75;

  const profile =
    usesTallWindowStack ? PROFILES.tall :
    (cellsH > mid) ? PROFILES.compactTall :
    (cellsH >= low) ? PROFILES.mid :
    PROFILES.short;

  const cols = 2;
  let rows = profile.rows;

  let winW = Math.max(smallScale ? 1 : 2, Math.round(pxW   * profile.WIN_W_FRAC));
  const winH = Math.max(smallScale ? 1 : 2, Math.round(bodyH * profile.WIN_H_FRAC));
  let gapX = Math.max(smallScale ? 1 : 2, Math.round(pxW   * profile.H_GAP_FRAC));
  const gapY = Math.max(smallScale ? 1 : 2, Math.round(bodyH * profile.V_GAP_FRAC));

  const targetRowW = 2 * winW + gapX;
  const maxRowW = Math.floor(pxW * 0.92);
  if (targetRowW > maxRowW) {
    const over = targetRowW - maxRowW;
    const giveW = Math.min(over * 0.6, Math.max(0, winW - 2));
    const giveG = Math.min(over * 0.4, Math.max(0, gapX - 2));
    winW = Math.max(2, winW - Math.round(giveW));
    gapX = Math.max(2, gapX - Math.round(giveG));
  }

  const topOffset  = Math.round(bodyH * profile.TOP_FRAC);
  const bottomKeep = Math.round(bodyH * profile.BOT_FRAC);
  const usableH    = Math.max(0, bodyH - topOffset - bottomKeep);

  while (rows > 1 && rows * winH + (rows - 1) * gapY > usableH) rows -= 1;
  if (rows < 1) rows = 1;

  let totalWindows = Math.min(rows * cols, 8);
  if (totalWindows < 2) totalWindows = 2;

  const dynamicLitRatio = Math.pow(1 - u, WINDOW_OSC.litCurve);
  const minLitRatio = darkMode ? 0.12 : 0.06;
  const litCount = Math.min(
    totalWindows,
    Math.max(1, Math.round(Math.max(minLitRatio, dynamicLitRatio) * totalWindows))
  );
  const litSlots = new Set(
    Array.from({ length: totalWindows }, (_, idx) => ({
      idx,
      rank: rand01(hash32(`house-lit-slot|${String(seed)}|${String(idx)}`)),
    }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, litCount)
      .map((slot) => slot.idx)
  );

  const actualBandH = (rows > 1) ? (rows - 1) * gapY + rows * winH : winH;
  const extra = usableH - actualBandH;
  const bandStartY = bodyY + topOffset + Math.floor(extra * 0.5);

  let drawn = 0;
  for (let rr = 0; rr < rows; rr++) {
    if (drawn >= totalWindows) break;

    const y = bandStartY + rr * (winH + gapY);
    const rowWidth = 2 * winW + gapX;
    const startX = pxX + (pxW - rowWidth) / 2;

    for (let cc = 0; cc < cols; cc++) {
      if (drawn >= totalWindows) break;
      const x = startX + cc * (winW + gapX);

      if (y >= roofY + 2 && y + winH <= bodyY + bodyH - 2) {
        const litRand = rand01(hash32(`house-lit|${String(seed)}|${String(rr)}|${String(cc)}|${String(drawn)}`));
        const litIdx = Math.floor(litRand * winLitVariants.length) % winLitVariants.length;
        const isLit = litSlots.has(drawn);
        const darkVariantIdx = Math.floor(rand01(hash32(`house-dark-var|${String(seed)}|${String(rr)}|${String(cc)}|${String(drawn)}`)) * winDarkVariants.length) % winDarkVariants.length;
        let tint = isLit ? winLitVariants[litIdx] : winDarkVariants[darkVariantIdx];
        if (isLit) {
          const oscSeed = hash32(`house-window-osc|${String(seed)}|${String(rr)}|${String(cc)}|${String(drawn)}`);
          const oscPhase = rand01(oscSeed ^ 0x9e3779b9) * Math.PI * 2;
          const oscAmp = resolveRangeValue(WINDOW_OSC.amp, rand01(oscSeed ^ 0x85ebca6b));
          const oscSpeed = resolveRangeValue(WINDOW_OSC.speed, rand01(oscSeed ^ 0xc2b2ae35));
          const brightnessMin = resolveRangeValue(WINDOW_OSC.brightnessMin, rand01(oscSeed ^ 0x27d4eb2f));
          const brightnessMax = resolveRangeValue(WINDOW_OSC.brightnessMax, rand01(oscSeed ^ 0xbb67ae85));
          tint = clampBrightness(tint, brightnessMin, brightnessMax);
          tint = oscillateBrightness(tint, t, {
            amp: oscAmp,
            speed: oscSpeed,
            phase: oscPhase,
          });
          tint = oscillateWindowColor(tint, t, oscSeed);

          // Lightweight emissive feel: two soft pixel-glow shells behind the core window.
          const glowInner = mixRgb(tint, { r: 255, g: 244, b: 214 }, 0.28);
          const glowOuter = mixRgb(tint, { r: 255, g: 236, b: 188 }, 0.20);
          const glowPad1 = Math.max(1, Math.round(Math.min(winW, winH) * 0.20));
          const glowPad2 = glowPad1 + Math.max(1, Math.round(Math.min(winW, winH) * 0.12));

          fillRgb(p, glowOuter, Math.round(alpha * 0.12));
          p.rect(
            x - glowPad2,
            y - glowPad2,
            winW + glowPad2 * 2,
            winH + glowPad2 * 2,
            Math.round(cell * 0.03)
          );

          fillRgb(p, glowInner, Math.round(alpha * 0.22));
          p.rect(
            x - glowPad1,
            y - glowPad1,
            winW + glowPad1 * 2,
            winH + glowPad1 * 2,
            Math.round(cell * 0.025)
          );

          tint = mixRgb(tint, { r: 255, g: 248, b: 222 }, 0.18);
        }
        fillRgb(p, tint, alpha);
        p.rect(x, y, winW, winH, Math.round(cell * 0.02));
      }
      drawn++;
    }
  }
}

  p.pop(); // undo appear transform
}
