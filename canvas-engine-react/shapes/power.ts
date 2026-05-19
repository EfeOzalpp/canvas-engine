// src/canvas-engine/shapes/power.js
import {
  applyShapeMods,
  clamp01,
  val,
  blendRGB,
  stepAndDrawPuffs,
  clampBrightness,
  oscillateSaturation,
  footprintToPx,
  particleBucketRange,
  particleRowBucket,
} from "../modifiers/index";
import type { RGB } from "../modifiers/index";
import type { ShapeCanvas, ShapeDrawOptions, ShapePalette, ShapeSeed } from "./types";
import { applyExposureContrast, fillRgb, strokeRgb } from "./shared/color";
import { shapeHash32, seededUnit } from "./shared/random";

type NumberRange = [number, number];

interface PowerPalette extends ShapePalette {
  grass: RGB;
  mast: RGB;
  mastCore: RGB;
  hub: RGB;
  blade: RGB;
  bladeLine: RGB;
}

interface PowerSmokeOverrides {
  count?: number;
  sizeMin?: number;
  sizeMax?: number;
  lifeMin?: number;
  lifeMax?: number;
  speedMin?: number;
  speedMax?: number;
  gravity?: number;
  drag?: number;
  spreadAngle?: number;
  alpha?: number;
}

interface PowerOptions extends ShapeDrawOptions<PowerPalette> {
  rotorSpeed?: number;
  smokeOverrides?: PowerSmokeOverrides;
}

/* Palette */
const POWER_BASE_PALETTE: PowerPalette = {
  grass:    { r: 130, g: 160, b: 110 },
  mast:     { r: 203, g: 209, b: 209 },
  mastCore: { r: 178, g: 191,  b: 190 },
  hub:      { r: 185, g: 189, b: 188 },
  blade:    { r: 230, g: 235, b: 244 },
  bladeLine:{ r: 210, g: 120, b: 212 },
};

const POWER_DARK_PALETTE: PowerPalette = {
  grass: { r: 35, g: 77, b: 156 },
  mast:     { r: 136, g: 148, b: 187 },
  mastCore: { r: 118, g: 132, b: 168 },
  hub:      { r: 101, g: 119, b: 144 },
  blade:    { r: 136, g: 148, b: 187 },
  bladeLine:{ r: 115, g: 76,  b: 142 },
};

/* Tunables (lerp-able) */
const POWER = {
  grass: { colorBlend: [0.24, 0.34], satRange: [0.00, 0.22] },
  platform: { hFrac: [0.28, 0.34], radiusK: 0.12 },
  mast: {
    widthK:  [0.18, 0.22],
    waistK:  [0.82, 0.88],
    topRound:[0.32, 0.46],
    insetX:  [0.10, 0.12],
    topFrac: [0.14, 0.22],
    headroom:[0.12, 0.20],
    coreBlend: [0, 0.02],
  },
  rotor: {
    hubRk:   [0.11, 0.15],
    bladeLk: [0.82, 1.10],
    bladeWk: [0.10, 0.14],
    bladeTipRound: 0.6,
    spinSpeed: [0.1, 0.35],
    spinJitter: Math.PI * 0.6,
    scaleK: [1.15, 1],
    hubYOffsetK: [0.28, 0.16],
    line: {
      weight: [1, 2],
      lenK:   [0.5, 0.65],
      offset: [5, 7],
      alpha:  [150, 125],
    },
    bladeOsc: { amp: [0, 0.4], speed: [0.2, 0.4] },
  },
  kindBalance: {
    midpoint: 0.5,
    midpointBand: 0.08,
  },
} satisfies {
  grass: { colorBlend: NumberRange; satRange: NumberRange };
  platform: { hFrac: NumberRange; radiusK: number };
  mast: {
    widthK: NumberRange;
    waistK: NumberRange;
    topRound: NumberRange;
    insetX: NumberRange;
    topFrac: NumberRange;
    headroom: NumberRange;
    coreBlend: NumberRange;
  };
  rotor: {
    hubRk: NumberRange;
    bladeLk: NumberRange;
    bladeWk: NumberRange;
    bladeTipRound: number;
    spinSpeed: NumberRange;
    spinJitter: number;
    scaleK: NumberRange;
    hubYOffsetK: NumberRange;
    line: { weight: NumberRange; lenK: NumberRange; offset: NumberRange; alpha: NumberRange };
    bladeOsc: { amp: NumberRange; speed: NumberRange };
  };
  kindBalance: { midpoint: number; midpointBand: number };
};

/* Helpers */
function clampBrightnessLocal(rgb: RGB, minK: number, maxK: number): RGB {
  const maxC = Math.max(rgb.r, rgb.g, rgb.b);
  const k = maxC / 255 || 1;
  const l = Math.max(minK, Math.min(maxK, k));
  const s = l / k;
  return { r: Math.round(rgb.r * s), g: Math.round(rgb.g * s), b: Math.round(rgb.b * s) };
}
function clampSaturation(rgb: RGB, minS: number, maxS: number): RGB {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const v = max;
  const s = max ? (max - min) / max : 0;
  const s2 = Math.max(minS, Math.min(maxS, s));
  if (s === 0 || s2 === s) return rgb;
  const m = (max - min) ? (s2 * v) / (max - min) : 1;
  const r = v - (v - rgb.r) * m;
  const g = v - (v - rgb.g) * m;
  const b = v - (v - rgb.b) * m;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}
function mulRgb(rgb: RGB, k: number): RGB {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return { r: clamp(rgb.r * k), g: clamp(rgb.g * k), b: clamp(rgb.b * k) };
}

/* Deterministic noise / randomness */
function hash32(s: string): number { return shapeHash32(s); }
function rand01(seed: number): number { return seededUnit(seed); }

/* Factory smoke config (purple-tinted, house-like params) */
const FACTORY_SMOKE = {
  spawnX: [0.00, 0.80],
  spawnY: [0.10, 0.25], // lowered so frame 1 shows upward motion
  count:  [48, 16],
  sizeMin:[3, 0],
  sizeMax:[6, 1],
  lifeMin:[12, 3],
  lifeMax:[24, 5],
  alpha:  [210, 0],
  dir: 'up',
  spreadAngle: [6, 0.26],
  speedMin: [6, 14],
  speedMax: [12, 22],
  gravity: [-16, -8],
  drag: [0.55, 0.72],
  jitterPos: [0.4, 1.2],
  jitterAngle: [0.06, 0.16],
  fadeInFrac: 0.22,
  fadeOutFrac: 0.38,
  edgeFadePx: { left: 2, right: 2, top: 2, bottom: 4 },
  sizeHz: 4,
  base: blendRGB(POWER_BASE_PALETTE.bladeLine, { r: 60, g: 60, b: 80 }, 0.65),
  blendK: [0.05, 0.60],
  satOscAmp: [0.2, 0.4],
  satOscSpeed: [0.12, 0.20],
  brightnessRange: [2, 0.5],
  colWk: 0.20,
  colHk: 2.60,
} satisfies {
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
  colWk: number;
  colHk: number;
};

function factorySmokeRowContext(t: number) {
  return {
    size: particleBucketRange(t, 0.26, 1.0),
    motion: particleBucketRange(t, 0.12, 1.0),
    life: particleBucketRange(t, 1.18, 1.0),
    count: particleBucketRange(t, 0.52, 1.0),
    columnW: particleBucketRange(t, 0.70, 1.0),
    columnH: particleBucketRange(t, 0.78, 1.0),
  };
}

/* Probability — S-curve: factory dominant below 0.35, turbine dominant above 0.65 */
function windProbability(u: number): number {
  const t = clamp01((u - 0.30) / (0.70 - 0.30));
  return t * t * (3 - 2 * t); // smoothstep
}

/* ====== NEW: seed helpers not tied to footprint/bleed ====== */
function randFromKey(key: ShapeSeed): number {
  const seed = hash32(String(key));
  return rand01(seed);
}
function instanceRand01FromKey(key: ShapeSeed): number {
  return randFromKey(`power-kind-v2|${String(key)}`);
}
function factoryLayoutFromKey(key: ShapeSeed): { chimneyOnLeft: boolean; roofRiseK: number } {
  const seed = hash32(`factory-layout|${String(key)}`);
  const rA = rand01(seed ^ 0x9e3779b9);
  const rB = rand01(seed ^ 0x85ebca6b);
  const chimneyOnLeft = rA < 0.5;
  const roofRiseK = 0.08 + 0.08 * rB;
  return { chimneyOnLeft, roofRiseK };
}
function pickBodyTintVariantFromKey(key: ShapeSeed, gradientRGB: RGB | undefined, ex: number, ct: number, pal: PowerPalette): RGB {
  const seed = hash32(`power-body|${String(key)}`);
  const r = rand01(seed);
  const variants = pal === POWER_DARK_PALETTE
    ? [
        { r: 92, g: 108, b: 126 },
        { r: 102, g: 116, b: 132 },
        blendRGB({ r: 96, g: 110, b: 128 }, pal.hub, 0.18),
        blendRGB({ r: 100, g: 114, b: 134 }, pal.mastCore, 0.10),
      ]
    : [
        mulRgb(pal.mast, 0.78),
        mulRgb(pal.mast, 0.82),
        blendRGB(mulRgb(pal.mast, 0.85), pal.hub, 0.15),
        blendRGB(mulRgb(pal.mast, 0.88), pal.mastCore, 0.10),
      ];
  let tint = variants[Math.floor(r * variants.length) % variants.length];
  if (gradientRGB) tint = blendRGB(tint, gradientRGB, 0.06);
  return applyExposureContrast(tint, ex, ct);
}

/* Draw */
export function drawPower(
  p: ShapeCanvas,
  cx: number,
  cy: number,
  r: number,
  opts: PowerOptions = {}
): void {
  const pal = opts.palette ?? (opts.darkMode ? POWER_DARK_PALETTE : POWER_BASE_PALETTE);
  const cell = opts.cell;
  const cellW = opts.cellW ?? cell;
  const cellH = opts.cellH ?? cell;
  const f = opts.footprint;
  const u = clamp01(opts.liveAvg ?? 0.5);
  const ex = typeof opts.exposure === 'number' ? opts.exposure : 1;
  const ct = typeof opts.contrast === 'number' ? opts.contrast : 1;
  const baseAlpha = typeof opts.alpha === "number" && Number.isFinite(opts.alpha) ? opts.alpha : 235;
  const gradientRGB = opts.gradientRGB ?? undefined;

  // Sprite export mode: infer from fitToFootprint or explicit override
  const isSprite = !!opts.fitToFootprint || !!opts.spriteMode;

  // Resolve pixel rect
  let pxX: number;
  let pxY: number;
  let pxW: number;
  let pxH: number;
  if (cell && f) {
    ({ x: pxX, y: pxY, w: pxW, h: pxH } = footprintToPx(f, opts));
  } else {
    pxW = (cell ?? r * 2) * 1;
    pxH = (cell ?? r * 2) * 3;
    pxX = cx - pxW / 2;
    pxY = cy - pxH / 2;
  }
  const localTileW = f ? pxW / Math.max(1, f.w) : (cellW ?? pxW);
  const localTileH = f ? pxH / Math.max(1, f.h) : (cellH ?? pxH);
  const localTile = Math.max(1, Math.min(localTileW, localTileH));
  const rowBucket = f ? particleRowBucket(f, opts) : { t: 1 };
  const smokeScale = factorySmokeRowContext(rowBucket.t);

  // 🔑 stable seed independent of bleed/footprint padding
  const seedKey = (opts.seedKey ?? opts.seed) ?? `${String(pxX)}|${String(pxY)}|${String(pxW)}x${String(pxH)}`;

  // Decide: turbine vs factory (stable regardless of bleed)
  const occurrenceIndex = typeof opts.shapeOccurrenceIndex === "number" && Number.isFinite(opts.shapeOccurrenceIndex) ? opts.shapeOccurrenceIndex : 0;
  const midpointDist = Math.abs(u - POWER.kindBalance.midpoint);
  const inMidpointBand = midpointDist <= POWER.kindBalance.midpointBand;
  const rInst = instanceRand01FromKey(`kind|${String(seedKey)}`);
  const asTurbine = inMidpointBand
    ? ((occurrenceIndex % 2) === 1)
    : (rInst < windProbability(u));

  // Appear envelope
  const anchorX = pxX + pxW / 2;
  const anchorY = pxY + pxH;
  const m = applyShapeMods({
    p,
    x: anchorX,
    y: anchorY,
    r: Math.min(pxW, pxH),
    opts: { alpha: baseAlpha, timeMs: opts.timeMs, liveAvg: opts.liveAvg, rootAppearK: opts.rootAppearK },
    mods: {
      appear: { scaleFrom: 0.0, alphaFrom: 0.0, anchor: 'bottom-center', ease: 'back', backOvershoot: 1.25 },
      sizeOsc: { mode: 'none' },
    },
  });

  const alpha = (typeof m.alpha === 'number') ? m.alpha : baseAlpha;

  p.push();
  p.translate(m.x, m.y);
  p.scale(m.scaleX, m.scaleY);
  p.translate(-anchorX, -anchorY);

  // --- IMPORTANT ---
  // Do NOT clip to the footprint rectangle here; it will cut blades/smoke in the bleed.
  // If you really want a clip in sprite mode, prefer clipping to the full canvas:
  // const ctx = p.drawingContext;
  // if (isSprite && p.width && p.height) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, p.width, p.height); ctx.clip(); }

  /* Grass platform */
  const platFrac = val(POWER.platform.hFrac, u);
  const platH = Math.max(2, Math.round(localTileH * platFrac));
  const platY = pxY + pxH - platH;

  let grassTint = pal.grass;
  if (gradientRGB) grassTint = blendRGB(grassTint, gradientRGB, val(POWER.grass.colorBlend, u));
  grassTint = clampSaturation(grassTint, POWER.grass.satRange[0], POWER.grass.satRange[1]);
  grassTint = clampBrightnessLocal(grassTint, 0.35, 0.90);
  grassTint = applyExposureContrast(grassTint, ex, ct);

  const rTop = Math.max(1, Math.round(localTile * POWER.platform.radiusK));
  p.noStroke();
  fillRgb(p, grassTint, alpha);
  p.rect(pxX, platY, pxW, platH, rTop, rTop, 0, 0);

  /* === FACTORY MODE === */
  if (!asTurbine) {
    const orientKey = `orient|${String(seedKey)}`;
    const { chimneyOnLeft: isLeftChimney } = factoryLayoutFromKey(orientKey);
    const roofVar = 0.9 + 0.25 * randFromKey(`${orientKey}|roofVar`);

    const bodyTint = pickBodyTintVariantFromKey(`body|${String(seedKey)}`, gradientRGB, ex, ct, pal);
    const bodyMarginX = Math.round(pxW * 0.14);
    const bodyW = Math.max(12, pxW - bodyMarginX * 2);
    const bodyH = Math.max(Math.round(pxH * 0.16), Math.round(localTileH * 0.9));
    const bodyX = pxX + bodyMarginX;
    const bodyTop = platY - bodyH;
    const roofRise = Math.round(Math.min(pxH * 0.10, localTileH * roofVar));

    p.noStroke();
    fillRgb(p, bodyTint, 255);
    p.rect(bodyX, bodyTop, bodyW, bodyH);

    const xL = bodyX, xR = bodyX + bodyW, yTop = bodyTop + 1;
    const highX = isLeftChimney ? xL : xR;
    const lowX  = isLeftChimney ? xR : xL;

    fillRgb(p, bodyTint, 255);
    p.triangle(lowX, yTop, highX, yTop, highX, yTop - roofRise);

    p.strokeWeight(1);
    strokeRgb(p, pal.mastCore, 255);
    p.noFill();
    p.line(lowX, yTop, highX, yTop - roofRise);
    p.noStroke();

    const doorW = bodyW * 0.18;
    const doorH = bodyH * 0.32;
    const doorX = bodyX + bodyW / 2 - doorW / 2;
    const doorY = platY - doorH - 2;
    const doorTint = applyExposureContrast(mulRgb(bodyTint, 0.8), ex, ct);
    fillRgb(p, doorTint, 255);
    p.rect(doorX, doorY, doorW, doorH, 1, 1, 0, 0);

    const tSec = (typeof opts.timeMs === 'number' ? opts.timeMs : p.millis()) / 1000;

    let emitW = Math.max(4, Math.round(bodyW * FACTORY_SMOKE.colWk * smokeScale.columnW));
    let emitH = Math.max(
      Math.round(localTileH * 1.4),
      Math.round(localTileH * FACTORY_SMOKE.colHk * smokeScale.columnH)
    );
    if (isSprite) { emitW = Math.round(emitW * 1.35); emitH = Math.round(emitH * 1.25); }

    const peakY  = yTop - roofRise;
    const chimW  = Math.max(
      3,
      Math.round(Math.max(pxW * 0.18, localTileW * 0.34))
    );
    const chimneyCenterX = isLeftChimney ? (xL + chimW / 2) : (xR - chimW / 2);
    const emitBiasX = Math.round(emitW * 0.05);
    const emitX  = chimneyCenterX - emitW / 2 - emitBiasX;
    const emitY  = peakY - Math.round(localTileH * (isSprite ? 1.05 : 1.00));

    const blendK = val(FACTORY_SMOKE.blendK, u);
    const satAmp = val(FACTORY_SMOKE.satOscAmp, u);
    const satSpd = val(FACTORY_SMOKE.satOscSpeed, u);

    let baseSmoke = FACTORY_SMOKE.base;
    if (gradientRGB) baseSmoke = blendRGB(baseSmoke, gradientRGB, blendK);

    let smoked = oscillateSaturation(baseSmoke, tSec, { amp: satAmp, speed: satSpd, phase: 0 });
    smoked = clampBrightness(smoked, FACTORY_SMOKE.brightnessRange[0], FACTORY_SMOKE.brightnessRange[1]);
    smoked = applyExposureContrast(smoked, ex, ct);

    const dt = (typeof opts.deltaSec === 'number' && opts.deltaSec > 0)
      ? opts.deltaSec
      : Math.max(1/120, (p.deltaTime ? p.deltaTime / 1000 : 1/60));

    let count    = Math.max(4, Math.floor(val(FACTORY_SMOKE.count, u) * smokeScale.count));
    let sizeMin  = val(FACTORY_SMOKE.sizeMin, u) * smokeScale.size;
    let sizeMax  = Math.max(sizeMin, val(FACTORY_SMOKE.sizeMax, u) * smokeScale.size);
    let lifeMin  = Math.max(0.05, val(FACTORY_SMOKE.lifeMin, u) * smokeScale.life);
    let lifeMax  = Math.max(lifeMin, val(FACTORY_SMOKE.lifeMax, u) * smokeScale.life);
    let sAlpha   = Math.max(60, Math.min(255, Math.round(val(FACTORY_SMOKE.alpha, u))));
    let speedMin = val(FACTORY_SMOKE.speedMin, u) * smokeScale.motion;
    let speedMax = Math.max(speedMin, val(FACTORY_SMOKE.speedMax, u) * smokeScale.motion);
    let gravity  = val(FACTORY_SMOKE.gravity, u) * smokeScale.motion;
    let drag     = val(FACTORY_SMOKE.drag, u);
    let jPos     = val(FACTORY_SMOKE.jitterPos, u) * smokeScale.size;
    const jAng   = val(FACTORY_SMOKE.jitterAngle, u);
    let spread   = val(FACTORY_SMOKE.spreadAngle, u);

    if (isSprite) {
      const sizeBoost = 1.25, speedBoost = 1.10, lifeBoost = 1.20;
      sizeMin *= sizeBoost; sizeMax *= sizeBoost;
      speedMin *= speedBoost; speedMax *= speedBoost;
      lifeMin *= lifeBoost;  lifeMax  *= lifeBoost;
      gravity *= 1.08;
      jPos *= 0.85;
      sAlpha = Math.min(255, Math.round(sAlpha * 1.05));
    }

    if (opts.smokeOverrides) {
      const o = opts.smokeOverrides;
      if (o.count != null) count = o.count;
      if (o.sizeMin != null) sizeMin = o.sizeMin;
      if (o.sizeMax != null) sizeMax = Math.max(sizeMin, o.sizeMax);
      if (o.lifeMin != null) lifeMin = o.lifeMin;
      if (o.lifeMax != null) lifeMax = Math.max(lifeMin, o.lifeMax);
      if (o.speedMin != null) speedMin = o.speedMin;
      if (o.speedMax != null) speedMax = Math.max(speedMin, o.speedMax);
      if (o.gravity != null) gravity = o.gravity;
      if (o.drag != null) drag = o.drag;
      if (o.spreadAngle != null) spread = o.spreadAngle;
      if (o.alpha != null) sAlpha = o.alpha;
    }

    const spawn = {
      x0: FACTORY_SMOKE.spawnX[0],
      x1: FACTORY_SMOKE.spawnX[1],
      y0: FACTORY_SMOKE.spawnY[0],
      y1: FACTORY_SMOKE.spawnY[1],
    };

    stepAndDrawPuffs(p, {
      key: `factory-smoke:${String(seedKey)}${isSprite ? ':spr' : ''}`,
      rect: { x: emitX, y: emitY, w: emitW, h: emitH },
      dir: FACTORY_SMOKE.dir,
      spreadAngle: spread,
      speed: { min: speedMin, max: speedMax },
      gravity,
      drag,
      accel: { x: 0, y: 0 },
      spawn,
      jitter: { pos: jPos, velAngle: jAng },
      count,
      size: { min: sizeMin, max: sizeMax },
      sizeHz: FACTORY_SMOKE.sizeHz,
      lifetime: { min: lifeMin, max: lifeMax },
      fadeInFrac: FACTORY_SMOKE.fadeInFrac,
      fadeOutFrac: FACTORY_SMOKE.fadeOutFrac,
      edgeFadePx: isSprite ? { left: 3, right: 3, top: 0, bottom: 8 } : FACTORY_SMOKE.edgeFadePx,
      color: { r: smoked.r, g: smoked.g, b: smoked.b, a: sAlpha },
      respawn: true,
    }, dt);

    // chimney
    const chimTopTarget = Math.max(
      pxY + Math.round(localTileH * 0.20),
      peakY - Math.round(localTileH * 0.10)
    );
    const chimH  = Math.max(Math.round(localTileH * 0.42), platY - chimTopTarget);
    const chimX  = isLeftChimney ? (xL) : (xR - chimW);
    const chimY  = platY - chimH;

    let chimTint = opts.darkMode
      ? { r: 112, g: 126, b: 148 }
      : pal.mast;
    if (gradientRGB) chimTint = blendRGB(chimTint, gradientRGB, 0.08);
    chimTint = applyExposureContrast(chimTint, ex, ct);
    fillRgb(p, chimTint, 255);
    p.rect(chimX, chimY, chimW, chimH);
    const capH = Math.max(1, Math.round(localTileH * 0.12));
    const capY = chimY - Math.max(1, Math.round(localTileH * 0.10));
    p.rect(chimX, capY, chimW, capH);

    const capOver = Math.round(chimW * 0.15);
    const capStrokeW = Math.max(1, Math.round(localTileH * 0.16));
    p.strokeWeight(capStrokeW);
    strokeRgb(p, pal.mastCore, 255);
    const capX0 = chimX - capOver / 2;
    const capX1 = chimX + chimW + capOver / 2;
    p.line(capX0, capY, capX1, capY);
    p.noStroke();

    // If you enabled canvas-wide clipping above, restore here:
    // if (isSprite && p.width && p.height) { ctx.restore(); }

    p.pop();
    return;
  }

  /* === TURBINE MODE === */

  const compactTurbine = localTile <= 10 || pxW < 18;
  const insetX   = Math.round(pxW * val(POWER.mast.insetX, u));
  const baseW    = Math.max(Math.min(3, Math.round(localTileW * 0.18)), Math.round(pxW * val(POWER.mast.widthK, u)));
  const waistW   = Math.max(Math.min(2, Math.round(localTileW * 0.14)), Math.round(baseW * val(POWER.mast.waistK, u)));
  const topRFrac = val(POWER.mast.topRound, u);

  const groundTop   = pxY + pxH;
  const mastBottomY = groundTop - Math.max(2, Math.round(localTileH * platFrac));
  const mastTopFrac = val(POWER.mast.topFrac, u);
  const headroom    = val(POWER.mast.headroom, u);
  const tileTopY    = pxY + Math.round(pxH * mastTopFrac);
  const mastClearance = compactTurbine ? Math.max(14, Math.round(localTileH * 2.1)) : 32;
  const mastTopY    = Math.min(tileTopY + Math.round(pxH * headroom * 0.22), mastBottomY - mastClearance);
  const mastH       = Math.max(compactTurbine ? 12 : 16, mastBottomY - mastTopY);

  const cxTile = pxX + pxW / 2;
  const baseX0 = cxTile - baseW / 2;
  const baseX1 = cxTile + baseW / 2;
  const waistX0 = cxTile - waistW / 2;
  const waistX1 = cxTile + waistW / 2;

  const minX = pxX + insetX;
  const maxX = pxX + pxW - insetX;
  const clampX = (v: number) => Math.max(minX, Math.min(maxX, v));

  const b0 = clampX(baseX0), b1 = clampX(baseX1);
  const w0 = clampX(waistX0), w1 = clampX(waistX1);

  let mastTint2 = pal.mast;
  if (gradientRGB) mastTint2 = blendRGB(mastTint2, gradientRGB, 0.10);
  mastTint2 = applyExposureContrast(mastTint2, ex, ct);

  const hubR   = compactTurbine
    ? Math.max(1, Math.round(localTileW * 0.10))
    : Math.max(Math.min(2, Math.round(localTileW * 0.10)), Math.round(localTileW * val(POWER.rotor.hubRk, u)));
  const hubCx  = cxTile;
  const hubCy  = mastTopY + Math.round(mastH * val(POWER.rotor.hubYOffsetK, u));

  p.noStroke();
  fillRgb(p, mastTint2, 255);
  p.beginShape();
  p.vertex(b0, mastBottomY);
  p.vertex(b1, mastBottomY);
  p.vertex(w1, mastTopY + Math.round(mastH * 0.42));
  p.vertex(w0, mastTopY + Math.round(mastH * 0.42));
  p.endShape(p.CLOSE);

  let coreBase = pal.mastCore;
  if (gradientRGB) coreBase = blendRGB(coreBase, gradientRGB, val(POWER.mast.coreBlend, u));
  const coreTint = applyExposureContrast(coreBase, ex, ct);

  const capW  = Math.max(4, Math.round(waistW * 0.98));
  const capR  = Math.round(capW * topRFrac);
  const capCx = cxTile;
  const capY  = mastTopY + Math.round(mastH * 0.42);

  const invX = m.scaleX !== 0 ? 1 / m.scaleX : 1;
  const invY = m.scaleY !== 0 ? 1 / m.scaleY : 1;

  p.push();
  p.rectMode(p.CENTER);
  p.translate(capCx, capY - capR);
  p.scale(invX, invY);
  fillRgb(p, coreTint, 255);
  p.rect(0, 0, capW, capR * 2, capR, capR, 0, 0);
  p.pop();

  const capTopY = (capY - capR) - capR;

  p.push();
  const hiW = Math.max(2, Math.round(Math.max(4, Math.round(waistW * 0.98)) * 0.36));
  const hiX = cxTile - Math.max(1, Math.round(Math.max(4, Math.round(waistW * 0.98)) * 0.18));
  const hiY = mastTopY + Math.round(mastH * 0.30);
  const hiH = Math.max(6, Math.round(mastH * 0.12));
  p.translate(hiX + hiW / 2, hiY + hiH / 2);
  p.scale(invX, invY);
  p.rectMode(p.CENTER);
  fillRgb(p, coreTint, Math.round(alpha * 0.45));
  p.rect(0, 0, hiW, hiH);
  p.pop();

  {
    p.push();
    p.strokeWeight(Math.max(1, Math.round(localTileW * 0.08)));
    strokeRgb(p, pal.mastCore, 255);
    p.noFill();
    const lineEndY = capTopY + 2;
    p.line(hubCx, hubCy, hubCx, lineEndY);
    p.pop();
  }

  const bladeRef = Math.max(localTileW, localTileH);
  const bladeScale = compactTurbine ? 0.72 : 1;
  const bladeL = Math.max(hubR * 2, Math.round(bladeRef * val(POWER.rotor.bladeLk, u) * bladeScale));
  const bladeW = compactTurbine
    ? Math.max(2, Math.round(bladeRef * val(POWER.rotor.bladeWk, u) * 0.78))
    : Math.max(3, Math.round(bladeRef * val(POWER.rotor.bladeWk, u)));
  const tipR   = compactTurbine
    ? Math.max(1, Math.round(bladeW * 0.4))
    : Math.round(bladeW * POWER.rotor.bladeTipRound);

  const tSec  = (typeof opts.timeMs === 'number' ? opts.timeMs : p.millis()) / 1000;
  const seed  = hash32(`power|${String(seedKey)}`) >>> 0;
  const phase = rand01(seed) * POWER.rotor.spinJitter;
  const speed = (typeof opts.rotorSpeed === 'number') ? opts.rotorSpeed : val(POWER.rotor.spinSpeed, u);

  const hubTint   = applyExposureContrast(pal.hub,   ex, ct);
  const lineTint  = applyExposureContrast(pal.bladeLine, ex, ct);

  const baseBlade = applyExposureContrast(pal.blade, ex, ct);
  const oscAmp    = val(POWER.rotor.bladeOsc.amp, u);
  const oscSpd    = val(POWER.rotor.bladeOsc.speed, u);
  const phase2    = phase + Math.PI * 2 * rand01(seed ^ 0xABCDEF);
  const oscK      = 1 + oscAmp * Math.sin(tSec * oscSpd + phase2);
  const bladeTint = mulRgb(baseBlade, oscK);

  const rotorMods = applyShapeMods({
    p, x: hubCx, y: hubCy, r: hubR,
    opts: { timeMs: opts.timeMs, liveAvg: opts.liveAvg },
    mods: {
      rotation: { speed, phase },
      scale2D:  {
        x: compactTurbine ? 1 : val(POWER.rotor.scaleK, u),
        y: compactTurbine ? 1 : val(POWER.rotor.scaleK, u),
        anchor: 'bottom-center'
      },
    }
  });

  p.push();
  p.translate(hubCx, hubCy);
  p.rotate(rotorMods.rotation || 0);

  const sc = rotorMods.scaleX;
  p.translate(0, hubR);
  p.scale(sc, sc);
  p.translate(0, -hubR);

  const showBladeLine = !compactTurbine && bladeL >= 10 && bladeW >= 3;
  const lineW   = showBladeLine ? Math.max(1, Math.round(val(POWER.rotor.line.weight, u))) : 0;
  const lineLen = Math.round(bladeL * val(POWER.rotor.line.lenK, u));
  const lineOff = Math.round(Math.min(val(POWER.rotor.line.offset, u), hubR * 0.5));
  const lineA   = Math.round(val(POWER.rotor.line.alpha, u));
  const lineY   = Math.round(bladeW / 2 - Math.max(1, lineW || 1));

  for (let i = 0; i < 3; i++) {
    const ang = i * (Math.PI * 2 / 3);
    p.push();
    p.rotate(ang);

    if (showBladeLine) {
      p.strokeWeight(lineW);
      strokeRgb(p, lineTint, Math.min(alpha, lineA));
      p.noFill();
      p.line(hubR + lineOff, lineY, hubR + lineOff + lineLen, lineY);
    }

    p.noStroke();
    fillRgb(p, bladeTint, alpha);
    p.rectMode(p.CENTER);
    const rootGap = Math.max(1, Math.round(hubR * (compactTurbine ? 0.12 : 0.2)));
    p.rect(bladeL / 2, 0, bladeL - rootGap, bladeW, tipR);

    p.rectMode(p.CORNER);
    const rootLen = compactTurbine
      ? Math.max(3, Math.round(bladeL * 0.14))
      : Math.max(6, Math.round(bladeL * 0.18));
    p.rect(-rootGap, -Math.round(bladeW * 0.65), rootLen, Math.round(bladeW * 1.3), Math.round(bladeW * 0.6));

    p.pop();
  }
  p.pop();

  // hub on top
  p.noStroke();
  fillRgb(p, hubTint, alpha);
  p.circle(hubCx, hubCy, hubR * 2);

  // If you enabled canvas-wide clipping above, restore here:
  // if (isSprite && p.width && p.height) { ctx.restore(); }

  p.pop(); // appear transform
}

export default drawPower;
