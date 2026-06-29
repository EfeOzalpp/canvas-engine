// src/canvas-engine/shapes/power.ts
import {
  applySrgbExposureContrast,
  applyShapeMods,
  clamp01,
  resolveRangeValue,
  blendRGB,
  stepAndDrawPuffs,
  clampBrightness,
  oscillateSaturation,
  footprintToPx,
  particleBucketRange,
  particleDepthAlpha,
  particleDepthSizeScale,
  particleRowBucket,
  fillRgb,
  scaleRgb,
  strokeRgb,
  seededUnit as rand01,
  shapeColorForRenderPass,
  shapeHash32 as hash32,
  shouldDrawInRenderPass,
} from "../modifiers/index";
import type { NumberRange, RGB } from "../modifiers/index";
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

interface PowerPalette extends ShapePalette {
  grass: RGB;
  mast: RGB;
  mastCore: RGB;
  hub: RGB;
  blade: RGB;
  bladeLine: RGB;
}

interface PowerOptions extends ShapeDrawOptions<PowerPalette> {
  rotorSpeed?: number;
}

// Tunables.
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
    bladeOsc: { amp: [0, 0.2], speed: [0.2, 0.4] },
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

const FACTORY_SMOKE = {
  spawnX: [0.00, 0.80],
  spawnY: [0.10, 0.25], // lowered so frame 1 shows upward motion
  count:  [54, 20],
  sizeMin:[3.2, 1.0],
  sizeMax:[6.8, 2.2],
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
  base: blendRGB({ r: 210, g: 120, b: 212 }, { r: 60, g: 60, b: 80 }, 0.65),
  blendK: [0.05, 0.60],
  satOscAmp: [0.2, 0.4],
  satOscSpeed: [0.12, 0.20],
  brightnessRange: [2, 0.5],
  colWk: 0.28,
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

// Palettes.
const POWER_BASE_PALETTE: PowerPalette = {
  grass: { r: 130, g: 160, b: 110 },
  mast: { r: 203, g: 209, b: 209 },
  mastCore: { r: 178, g: 191, b: 190 },
  hub: { r: 185, g: 189, b: 188 },
  blade: { r: 230, g: 235, b: 244 },
  bladeLine: { r: 210, g: 120, b: 212 },
};

const POWER_DARK_PALETTE: PowerPalette = {
  grass: { r: 35, g: 77, b: 156 },
  mast: { r: 136, g: 148, b: 187 },
  mastCore: { r: 118, g: 132, b: 168 },
  hub: { r: 101, g: 119, b: 144 },
  blade: { r: 136, g: 148, b: 187 },
  bladeLine: { r: 115, g: 76, b: 142 },
};

// Helpers.
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

// 0-0.25: always factory | 0.25-0.5: 25% turbine | 0.5-0.75: 75% turbine | 0.75-1: always turbine
function windProbability(u: number): number {
  if (u < 0.25) return 0;
  if (u < 0.5) return 0.25;
  if (u < 0.75) return 0.75;
  return 1;
}

// Seed helpers not tied to footprint or bleed.
function randFromKey(key: ShapeSeed): number {
  const seed = hash32(String(key));
  return rand01(seed);
}
function instanceRand01FromKey(key: ShapeSeed): number {
  return randFromKey(`power-kind-v2|${String(key)}`);
}
export type PowerVisualKind = "windTurbine" | "factory";

export function resolvePowerVisualKind({
  liveAvg,
  seedKey,
  occurrenceIndex: _occurrenceIndex = 0,
}: {
  liveAvg: number;
  seedKey: ShapeSeed;
  occurrenceIndex?: number;
}): PowerVisualKind {
  const u = clamp01(liveAvg);
  const rInst = instanceRand01FromKey(`kind|${String(seedKey)}`);
  const asTurbine = rInst < windProbability(u);

  return asTurbine ? "windTurbine" : "factory";
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
        scaleRgb(pal.mast, 0.78),
        scaleRgb(pal.mast, 0.82),
        blendRGB(scaleRgb(pal.mast, 0.85), pal.hub, 0.15),
        blendRGB(scaleRgb(pal.mast, 0.88), pal.mastCore, 0.10),
      ];
  let tint = variants[Math.floor(r * variants.length) % variants.length];
  if (gradientRGB) tint = blendRGB(tint, gradientRGB, 0.06);
  return applySrgbExposureContrast(tint, ex, ct);
}

export function drawPower(
  p: ShapeCanvas,
  cx: number,
  cy: number,
  r: number,
  opts: PowerOptions = {}
): void {
  const projection = shapeProjection(opts);
  const style = shapeStyle(opts);
  const lifecycle = shapeLifecycle(opts);
  const identity = shapeIdentity(opts);
  const sprite = shapeSprite(opts);
  const particles = shapeParticles(opts);
  const pass = shapePass(opts);

  const darkMode = style.darkMode === true;
  const pal = style.palette ?? (darkMode ? POWER_DARK_PALETTE : POWER_BASE_PALETTE);
  const cell = projection.cell;
  const cellW = projection.cellW ?? cell;
  const cellH = projection.cellH ?? cell;
  const f = projection.footprint;
  const u = clamp01(style.liveAvg ?? 0.5);
  const ex = typeof style.exposure === 'number' ? style.exposure : 1;
  const ct = typeof style.contrast === 'number' ? style.contrast : 1;
  const baseAlpha = typeof style.alpha === "number" && Number.isFinite(style.alpha) ? style.alpha : 235;
  const renderPass = pass.renderPass ?? "color";
  const maskColor = pass.maskColor;
  const requestedMaskAlpha =
    typeof pass.maskAlpha === "number" && Number.isFinite(pass.maskAlpha)
      ? pass.maskAlpha
      : baseAlpha;
  const shouldDrawMass = shouldDrawInRenderPass(renderPass, true);
  const shouldDrawColorDetails = shouldDrawInRenderPass(renderPass, false);
  const gradientRGB = style.gradientRGB ?? undefined;

  // Sprite export mode: infer from fitToFootprint or explicit override
  const isSprite = !!sprite.fitToFootprint || !!sprite.spriteMode;

  // Resolve pixel rect
  let pxX: number;
  let pxY: number;
  let pxW: number;
  let pxH: number;
  if (cell && f) {
    ({ x: pxX, y: pxY, w: pxW, h: pxH } = footprintToPx(f, projection));
  } else {
    pxW = (cell ?? r * 2) * 1;
    pxH = (cell ?? r * 2) * 3;
    pxX = cx - pxW / 2;
    pxY = cy - pxH / 2;
  }
  const localTileW = f ? pxW / Math.max(1, f.w) : (cellW ?? pxW);
  const localTileH = f ? pxH / Math.max(1, f.h) : (cellH ?? pxH);
  const localTile = Math.max(1, Math.min(localTileW, localTileH));
  const rowBucket = f ? particleRowBucket(f, projection) : undefined;
  const smokeScale = factorySmokeRowContext(rowBucket?.t ?? 1);
  const particleSizeK = particleDepthSizeScale(rowBucket);

  // Stable seed independent of bleed/footprint padding.
  const seedKey = (identity.seedKey ?? identity.seed) ?? `${String(pxX)}|${String(pxY)}|${String(pxW)}x${String(pxH)}`;

  // Decide: turbine vs factory (stable regardless of bleed)
  const occurrenceIndex = typeof identity.shapeOccurrenceIndex === "number" && Number.isFinite(identity.shapeOccurrenceIndex) ? identity.shapeOccurrenceIndex : 0;
  const asTurbine = resolvePowerVisualKind({
    liveAvg: u,
    seedKey,
    occurrenceIndex,
  }) === "windTurbine";

  // Root appear is the standard bottom-center envelope.
  const anchorX = pxX + pxW / 2;
  const anchorY = pxY + pxH;
  const m = applyShapeMods({
    p,
    x: anchorX,
    y: anchorY,
    r: Math.min(pxW, pxH),
    opts: { alpha: baseAlpha, timeMs: lifecycle.timeMs, rootAppearK: lifecycle.rootAppearK, selectK: lifecycle.selectK },
  });

  const alpha = (typeof m.alpha === 'number') ? m.alpha : baseAlpha;
  const appearAlphaK = baseAlpha > 0 ? clamp01(alpha / baseAlpha) : 1;
  const maskAlpha = renderPass === "depthMask"
    ? Math.round(requestedMaskAlpha * appearAlphaK)
    : alpha;
  const massAlpha = renderPass === "depthMask" ? maskAlpha : alpha;

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
  const platFrac = resolveRangeValue(POWER.platform.hFrac, u);
  const platH = Math.max(2, Math.round(localTileH * platFrac));
  const platY = pxY + pxH - platH;

  let grassTint = pal.grass;
  if (gradientRGB) grassTint = blendRGB(grassTint, gradientRGB, resolveRangeValue(POWER.grass.colorBlend, u));
  grassTint = clampSaturation(grassTint, POWER.grass.satRange[0], POWER.grass.satRange[1]);
  grassTint = clampBrightnessLocal(grassTint, 0.35, 0.90);
  grassTint = applySrgbExposureContrast(grassTint, ex, ct);

  const rTop = Math.max(1, Math.round(localTile * POWER.platform.radiusK));
  if (shouldDrawMass) {
    p.noStroke();
    fillRgb(p, shapeColorForRenderPass(renderPass, grassTint, maskColor), massAlpha);
    p.rect(pxX, platY, pxW, platH, rTop, rTop, 0, 0);
  }

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
    const roofRise = Math.round(Math.min(pxH * 0.07, localTileH * roofVar));

    p.noStroke();
    if (shouldDrawMass) {
      fillRgb(p, shapeColorForRenderPass(renderPass, bodyTint, maskColor), renderPass === "depthMask" ? maskAlpha : 255);
      p.rect(bodyX, bodyTop, bodyW, bodyH);
    }

    const xL = bodyX, xR = bodyX + bodyW, yTop = bodyTop;
    const highX = isLeftChimney ? xL : xR;
    const lowX  = isLeftChimney ? xR : xL;

    if (shouldDrawMass) {
      fillRgb(p, shapeColorForRenderPass(renderPass, bodyTint, maskColor), renderPass === "depthMask" ? maskAlpha : 255);
      p.triangle(lowX, yTop, highX, yTop, highX, yTop - roofRise);
    }

    if (shouldDrawColorDetails) {
      p.strokeWeight(1);
      strokeRgb(p, pal.mastCore, 255);
      p.noFill();
      p.line(lowX, yTop, highX, yTop - roofRise);
      p.noStroke();
    }

    const doorW = bodyW * 0.18;
    const doorH = bodyH * 0.32;
    const doorX = bodyX + bodyW / 2 - doorW / 2;
    const doorY = platY - doorH - 2;
    if (shouldDrawColorDetails) {
      const doorTint = applySrgbExposureContrast(scaleRgb(bodyTint, 0.8), ex, ct);
      fillRgb(p, doorTint, 255);
      p.rect(doorX, doorY, doorW, doorH, 1, 1, 0, 0);
    }

    const tSec = (typeof lifecycle.timeMs === 'number' ? lifecycle.timeMs : p.millis()) / 1000;

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

    const blendK = resolveRangeValue(FACTORY_SMOKE.blendK, u);
    const satAmp = resolveRangeValue(FACTORY_SMOKE.satOscAmp, u);
    const satSpd = resolveRangeValue(FACTORY_SMOKE.satOscSpeed, u);

    let baseSmoke = FACTORY_SMOKE.base;
    if (gradientRGB) baseSmoke = blendRGB(baseSmoke, gradientRGB, blendK);

    let smoked = oscillateSaturation(baseSmoke, tSec, { amp: satAmp, speed: satSpd, phase: 0 });
    smoked = clampBrightness(smoked, FACTORY_SMOKE.brightnessRange[0], FACTORY_SMOKE.brightnessRange[1]);
    smoked = applySrgbExposureContrast(smoked, ex, ct);

    const dt = (typeof lifecycle.dtSec === 'number' && lifecycle.dtSec > 0)
      ? lifecycle.dtSec
      : Math.max(1/120, (p.deltaTime ? p.deltaTime / 1000 : 1/60));

    const count  = Math.max(4, Math.floor(resolveRangeValue(FACTORY_SMOKE.count, u) * smokeScale.count));
    let sizeMin  = resolveRangeValue(FACTORY_SMOKE.sizeMin, u) * smokeScale.size * particleSizeK;
    let sizeMax  = Math.max(sizeMin, resolveRangeValue(FACTORY_SMOKE.sizeMax, u) * smokeScale.size * particleSizeK);
    let lifeMin  = Math.max(0.05, resolveRangeValue(FACTORY_SMOKE.lifeMin, u) * smokeScale.life);
    let lifeMax  = Math.max(lifeMin, resolveRangeValue(FACTORY_SMOKE.lifeMax, u) * smokeScale.life);
    let sAlpha   = Math.max(60, Math.min(255, Math.round(resolveRangeValue(FACTORY_SMOKE.alpha, u))));
    let speedMin = resolveRangeValue(FACTORY_SMOKE.speedMin, u) * smokeScale.motion;
    let speedMax = Math.max(speedMin, resolveRangeValue(FACTORY_SMOKE.speedMax, u) * smokeScale.motion);
    let gravity  = resolveRangeValue(FACTORY_SMOKE.gravity, u) * smokeScale.motion;
    const drag   = resolveRangeValue(FACTORY_SMOKE.drag, u);
    let jPos     = resolveRangeValue(FACTORY_SMOKE.jitterPos, u) * smokeScale.size;
    const jAng   = resolveRangeValue(FACTORY_SMOKE.jitterAngle, u);
    const spread = resolveRangeValue(FACTORY_SMOKE.spreadAngle, u);

    if (isSprite) {
      const sizeBoost = 1.25, speedBoost = 1.10, lifeBoost = 1.20;
      sizeMin *= sizeBoost; sizeMax *= sizeBoost;
      speedMin *= speedBoost; speedMax *= speedBoost;
      lifeMin *= lifeBoost;  lifeMax  *= lifeBoost;
      gravity *= 1.08;
      jPos *= 0.85;
      sAlpha = Math.min(255, Math.round(sAlpha * 1.05));
    }

    const spawn = {
      x0: FACTORY_SMOKE.spawnX[0],
      x1: FACTORY_SMOKE.spawnX[1],
      y0: FACTORY_SMOKE.spawnY[0],
      y1: FACTORY_SMOKE.spawnY[1],
    };

    if (shouldDrawColorDetails) {
      stepAndDrawPuffs(p, {
        store: particles.particleStore,
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
        depthAlpha: particleDepthAlpha(rowBucket),
        respawn: true,
      }, dt);
    }

    // chimney
    const chimTopTarget = Math.max(
      pxY + Math.round(localTileH * 0.20),
      peakY - Math.round(localTileH * 0.10)
    );
    const chimH  = Math.max(Math.round(localTileH * 0.42), platY - chimTopTarget);
    const chimX  = isLeftChimney ? (xL) : (xR - chimW);
    const chimY  = platY - chimH;

    let chimTint = darkMode
      ? { r: 112, g: 126, b: 148 }
      : pal.mast;
    if (gradientRGB) chimTint = blendRGB(chimTint, gradientRGB, 0.08);
    chimTint = applySrgbExposureContrast(chimTint, ex, ct);
    if (shouldDrawMass) {
      fillRgb(p, shapeColorForRenderPass(renderPass, chimTint, maskColor), renderPass === "depthMask" ? maskAlpha : 255);
      p.rect(chimX, chimY, chimW, chimH);
    }
    const capH = Math.max(1, Math.round(localTileH * 0.12));
    const capY = chimY - Math.max(1, Math.round(localTileH * 0.10));
    if (shouldDrawMass) {
      p.rect(chimX, capY, chimW, capH);
    }

    if (shouldDrawMass) {
      const capOver = Math.round(chimW * 0.15);
      const capStrokeW = Math.max(1, Math.round(localTileH * 0.16));
      p.strokeWeight(capStrokeW);
      strokeRgb(p, shapeColorForRenderPass(renderPass, pal.mastCore, maskColor), renderPass === "depthMask" ? maskAlpha : 255);
      const capX0 = chimX - capOver / 2;
      const capX1 = chimX + chimW + capOver / 2;
      p.line(capX0, capY, capX1, capY);
      p.noStroke();
    }

    // If you enabled canvas-wide clipping above, restore here:
    // if (isSprite && p.width && p.height) { ctx.restore(); }

    p.pop();
    return;
  }

  /* === TURBINE MODE === */
  // The turbine depth mask includes the full drawn turbine, including rotor blades.
  // The runtime keeps power masks live so this pass can follow the blade angle.

  const compactTurbine = localTile <= 10 || pxW < 18;
  const insetX   = Math.round(pxW * resolveRangeValue(POWER.mast.insetX, u));
  const baseW    = Math.max(Math.min(3, Math.round(localTileW * 0.18)), Math.round(pxW * resolveRangeValue(POWER.mast.widthK, u)));
  const waistW   = Math.max(Math.min(2, Math.round(localTileW * 0.14)), Math.round(baseW * resolveRangeValue(POWER.mast.waistK, u)));
  const topRFrac = resolveRangeValue(POWER.mast.topRound, u);

  const groundTop   = pxY + pxH;
  const mastBottomY = groundTop - Math.max(1, Math.round(localTileH * platFrac));
  const mastTopFrac = resolveRangeValue(POWER.mast.topFrac, u);
  const headroom    = resolveRangeValue(POWER.mast.headroom, u);
  const tileTopY    = pxY + Math.round(pxH * mastTopFrac);
  const mastClearance = compactTurbine ? Math.max(6, Math.round(localTileH * 2.1)) : 32;
  const mastTopY    = Math.min(tileTopY + Math.round(pxH * headroom * 0.22), mastBottomY - mastClearance);
  const mastH       = Math.max(compactTurbine ? 6 : 16, mastBottomY - mastTopY);

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
  mastTint2 = applySrgbExposureContrast(mastTint2, ex, ct);

  const hubR   = compactTurbine
    ? Math.max(1, Math.round(localTileW * 0.10))
    : Math.max(Math.min(2, Math.round(localTileW * 0.10)), Math.round(localTileW * resolveRangeValue(POWER.rotor.hubRk, u)));
  const hubCx  = cxTile;
  const hubCy  = mastTopY + Math.round(mastH * resolveRangeValue(POWER.rotor.hubYOffsetK, u));

  if (shouldDrawMass) {
    p.noStroke();
    fillRgb(p, shapeColorForRenderPass(renderPass, mastTint2, maskColor), renderPass === "depthMask" ? maskAlpha : 255);
    p.beginShape();
    p.vertex(b0, mastBottomY);
    p.vertex(b1, mastBottomY);
    p.vertex(w1, mastTopY + Math.round(mastH * 0.42));
    p.vertex(w0, mastTopY + Math.round(mastH * 0.42));
    p.endShape(p.CLOSE);
  }

  let coreBase = pal.mastCore;
  if (gradientRGB) coreBase = blendRGB(coreBase, gradientRGB, resolveRangeValue(POWER.mast.coreBlend, u));
  const coreTint = applySrgbExposureContrast(coreBase, ex, ct);

  const capW  = Math.max(compactTurbine ? 2 : 4, Math.round(waistW * 0.98));
  const capR  = Math.round(capW * topRFrac);
  const capCx = cxTile;
  const capY  = mastTopY + Math.round(mastH * 0.42);

  const invX = m.scaleX !== 0 ? 1 / m.scaleX : 1;
  const invY = m.scaleY !== 0 ? 1 / m.scaleY : 1;

  if (shouldDrawMass) {
    p.push();
    p.rectMode(p.CENTER);
    p.translate(capCx, capY - capR);
    p.scale(invX, invY);
    fillRgb(p, shapeColorForRenderPass(renderPass, coreTint, maskColor), renderPass === "depthMask" ? maskAlpha : 255);
    p.rect(0, 0, capW, capR * 2, capR, capR, 0, 0);
    p.pop();
  }

  const capTopY = (capY - capR) - capR;

  if (shouldDrawMass) {
    p.push();
    const hiW = Math.max(2, Math.round(Math.max(4, Math.round(waistW * 0.98)) * 0.36));
    const hiX = cxTile - Math.max(1, Math.round(Math.max(4, Math.round(waistW * 0.98)) * 0.18));
    const hiY = mastTopY + Math.round(mastH * 0.30);
    const hiH = Math.max(6, Math.round(mastH * 0.12));
    p.translate(hiX + hiW / 2, hiY + hiH / 2);
    p.scale(invX, invY);
    p.rectMode(p.CENTER);
    fillRgb(
      p,
      shapeColorForRenderPass(renderPass, coreTint, maskColor),
      renderPass === "depthMask" ? maskAlpha : Math.round(alpha * 0.45)
    );
    p.rect(0, 0, hiW, hiH);
    p.pop();
  }

  if (shouldDrawMass) {
    p.push();
    p.strokeWeight(Math.max(compactTurbine ? 0.5 : 1, Math.round(localTileW * 0.08)));
    strokeRgb(p, shapeColorForRenderPass(renderPass, pal.mastCore, maskColor), renderPass === "depthMask" ? maskAlpha : 255);
    p.noFill();
    const lineEndY = capTopY + 2;
    p.line(hubCx, hubCy, hubCx, lineEndY);
    p.pop();
  }

  const hubTint   = applySrgbExposureContrast(pal.hub,   ex, ct);

  if (shouldDrawMass) {
    const bladeRef = Math.max(localTileW, localTileH);
    const bladeScale = compactTurbine ? 0.72 : 1;
    const bladeL = Math.max(hubR * 2, Math.round(bladeRef * resolveRangeValue(POWER.rotor.bladeLk, u) * bladeScale));
    const bladeW = compactTurbine
      ? Math.max(1, Math.round(bladeRef * resolveRangeValue(POWER.rotor.bladeWk, u) * 0.62))
      : Math.max(3, Math.round(bladeRef * resolveRangeValue(POWER.rotor.bladeWk, u)));
    const tipR   = compactTurbine
      ? Math.max(1, Math.round(bladeW * 0.4))
      : Math.round(bladeW * POWER.rotor.bladeTipRound);

    const tSec  = (typeof lifecycle.timeMs === 'number' ? lifecycle.timeMs : p.millis()) / 1000;
    const seed  = hash32(`power|${String(seedKey)}`) >>> 0;
    const phase = rand01(seed) * POWER.rotor.spinJitter;
    const speed = (typeof opts.rotorSpeed === 'number') ? opts.rotorSpeed : resolveRangeValue(POWER.rotor.spinSpeed, u);
    const lineTint = applySrgbExposureContrast(pal.bladeLine, ex, ct);

    const baseBlade = applySrgbExposureContrast(pal.blade, ex, ct);
    const oscAmp    = resolveRangeValue(POWER.rotor.bladeOsc.amp, u);
    const oscSpd    = resolveRangeValue(POWER.rotor.bladeOsc.speed, u);
    const phase2    = phase + Math.PI * 2 * rand01(seed ^ 0xABCDEF);
    const oscK      = 1 + oscAmp * Math.sin(tSec * oscSpd + phase2);
    const bladeTint = scaleRgb(baseBlade, oscK);

    const rotorMods = applyShapeMods({
      p, x: hubCx, y: hubCy, r: hubR,
      opts: { timeMs: lifecycle.timeMs },
      mods: {
        rotation: { speed, phase },
        scale2D:  {
          x: compactTurbine ? 1 : resolveRangeValue(POWER.rotor.scaleK, u),
          y: compactTurbine ? 1 : resolveRangeValue(POWER.rotor.scaleK, u),
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
    const lineW   = showBladeLine ? Math.max(1, Math.round(resolveRangeValue(POWER.rotor.line.weight, u))) : 0;
    const lineLen = Math.round(bladeL * resolveRangeValue(POWER.rotor.line.lenK, u));
    const lineOff = Math.round(Math.min(resolveRangeValue(POWER.rotor.line.offset, u), hubR * 0.5));
    const lineA   = Math.round(resolveRangeValue(POWER.rotor.line.alpha, u));
    const lineY   = Math.round(bladeW / 2 - Math.max(1, lineW || 1));

    for (let i = 0; i < 3; i++) {
      const ang = i * (Math.PI * 2 / 3);
      p.push();
      p.rotate(ang);

      if (showBladeLine) {
        p.strokeWeight(lineW);
        strokeRgb(
          p,
          shapeColorForRenderPass(renderPass, lineTint, maskColor),
          renderPass === "depthMask" ? maskAlpha : Math.min(alpha, lineA)
        );
        p.noFill();
        p.line(hubR + lineOff, lineY, hubR + lineOff + lineLen, lineY);
      }

      p.noStroke();
      fillRgb(p, shapeColorForRenderPass(renderPass, bladeTint, maskColor), massAlpha);
      p.rectMode(p.CENTER);
      const rootGap = Math.max(1, Math.round(hubR * (compactTurbine ? 0.12 : 0.2)));
      p.rect(bladeL / 2, 0, bladeL - rootGap, bladeW, tipR);

      p.rectMode(p.CORNER);
      const rootLen = compactTurbine
        ? Math.max(1, Math.round(bladeL * 0.12))
        : Math.max(6, Math.round(bladeL * 0.18));
      p.rect(-rootGap, -Math.round(bladeW * 0.65), rootLen, Math.round(bladeW * 1.3), Math.round(bladeW * 0.6));

      p.pop();
    }
    p.pop();
  }

  // hub on top
  if (shouldDrawMass) {
    p.noStroke();
    fillRgb(p, shapeColorForRenderPass(renderPass, hubTint, maskColor), massAlpha);
    p.circle(hubCx, hubCy, hubR * 2);
  }

  // If you enabled canvas-wide clipping above, restore here:
  // if (isSprite && p.width && p.height) { ctx.restore(); }

  p.pop(); // appear transform
}

