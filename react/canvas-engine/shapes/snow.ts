// src/canvas-engine/shapes/snow.ts
import {
  applySrgbExposureContrast,
  clamp01,
  resolveRangeValue,
  blendRGB,
  rgbToHsl,
  hslToRgb,
  clampBrightness,
  oscillateSaturation,
  makeArchLobes,
  displacementOsc,
  stepAndDrawPuffs,
  particleBucketRange,
  particleDepthAlpha,
  particleDepthSizeScale,
  particleRowBucket,
  footprintToPx,
  rowHeightAt,
  rowWidthAt,
  sampleDirectionalLightRect,
  pickLightBandValue,
  mixRgb,
  paintPixelLightBands,
  applyDepthTint,
  applyShapeMods,
} from "../modifiers/index";
import type { LightClosenessBandMap, NumberRange, RGB } from "../modifiers/index";
import type { ShapeCanvas, ShapeDrawOptions, ShapePalette } from "./types";
import {
  shapeIdentity,
  shapeLifecycle,
  shapeParticles,
  shapePass,
  shapeProjection,
  shapeSprite,
  shapeStyle,
} from "./options";

interface SnowPalette extends ShapePalette {
  cloud: RGB;
  cloudByLight?: LightClosenessBandMap<RGB>;
  flake: RGB;
  ground: RGB;
}

interface SnowOptions extends ShapeDrawOptions<SnowPalette> {
  showGround?: boolean;
  hideGroundAboveFrac?: number;
  hideGroundBelowBucketT?: number;
}

// Tunables.
const SCLOUD = {
  widthEnv:   [0.76, 0.86],
  heightEnv:  [0.80, 0.92],
  spreadX:    [0.92, 0.80],
  arcLift:    [0.22, 0.30],
  rBaseK:     [0.37, 0.46],
  rJitter:    [0.04, 0.08],
  lobeCount:  [5, 7],

  sCap:       [0.18, 0.10],
  blend:      [0.12, 0.03],
  oscAmp:     [0.02, 0.05],
  oscSpeed:   [0.10, 0.16],

  lightnessRange: [0.95, 1.0],
} satisfies Record<string, NumberRange>;

/* Ground strip */
const SGROUND = {
  blendK:        [0.18, 0.05],
  satOscAmp:     [0.00, 0.02],
  satOscSpeed:   [0.08, 0.14],
  lightnessRange:[0.96, 1.0],
  scaleY:        [0.20, 1.33],
} satisfies Record<string, NumberRange>;

/* Snow puffs */
const SNOW = {
  spawnX: [0.0, 0.9],
  spawnY: [0.00, 0.30],

  count:   [14, 26],
  sizeMin: [0.6, 1.8],
  sizeMax: [1.6, 2.8],

  lifeMin: [1.4, 8.0],
  lifeMax: [2.4, 12.0],

  emitterOverflowFrac: [0.00, 0.50],

  alpha: [210, 255],

  dir: 'down',
  spreadAngle: [0.60, 0.30],
  speedMin: [16, 24],
  speedMax: [26, 48],
  gravity:  [28, 16],
  drag:     [0.84, 0.92],
  jitterPos:   [0.4, 1.0],
  jitterAngle: [0.02, 0.06],

  fadeInFrac:  0.10,
  fadeOutFrac: 0.02,
  warmStartSec: 1.4,
  edgeFadePx:  { left: 2, right: 2, top: 8, bottom: 24 },

  sizeHz: 3,

  blendK:      [0.24, 0.06],
  satOscAmp:   [0.02, 0.05],
  satOscSpeed: [0.10, 0.18],

  lightnessRange: [0.9, 0.98],
} satisfies {
  spawnX: NumberRange;
  spawnY: NumberRange;
  count: NumberRange;
  sizeMin: NumberRange;
  sizeMax: NumberRange;
  lifeMin: NumberRange;
  lifeMax: NumberRange;
  emitterOverflowFrac: NumberRange;
  alpha: NumberRange;
  dir: "down";
  spreadAngle: NumberRange;
  speedMin: NumberRange;
  speedMax: NumberRange;
  gravity: NumberRange;
  drag: NumberRange;
  jitterPos: NumberRange;
  jitterAngle: NumberRange;
  fadeInFrac: number;
  fadeOutFrac: number;
  warmStartSec: number;
  edgeFadePx: { left: number; right: number; top: number; bottom: number };
  sizeHz: number;
  blendK: NumberRange;
  satOscAmp: NumberRange;
  satOscSpeed: NumberRange;
  lightnessRange: NumberRange;
};

// Palettes.
const SNOW_BASE_PALETTE: SnowPalette = {
  cloud: { r: 248, g: 250, b: 255 },
  flake: { r: 228, g: 235, b: 247 },
  ground: { r: 232, g: 238, b: 244 },
};

const SNOW_DARK_PALETTE: SnowPalette = {
  cloud: { r: 182, g: 189, b: 220 },
  cloudByLight: {
    far: { r: 255, g: 122, b: 148 },
    mid: { r: 192, g: 179, b: 210 },
    near: { r: 232, g: 238, b: 255 },
  },
  flake: { r: 160, g: 174, b: 208 },
  ground: { r: 148, g: 162, b: 194 },
};

// Helpers.
function snowRowContextScale(t: number) {
  return {
    size: particleBucketRange(t, 0.42, 1.0),
    motion: particleBucketRange(t, 0.07, 0.50),
    life: particleBucketRange(t, 1.18, 1.60),
    count: particleBucketRange(t, 0.60, 1.0),
  };
}

/**
 * drawSnow
 */
export function drawSnow(
  p: ShapeCanvas,
  _x: number,
  _y: number,
  _r: number,
  opts: SnowOptions = {}
): void {
  const projection = shapeProjection(opts);
  const style = shapeStyle(opts);
  const lifecycle = shapeLifecycle(opts);
  const identity = shapeIdentity(opts);
  const sprite = shapeSprite(opts);
  const particles = shapeParticles(opts);
  const pass = shapePass(opts);

  const darkMode = style.darkMode === true;
  const pal = style.palette ?? (darkMode ? SNOW_DARK_PALETTE : SNOW_BASE_PALETTE);
  const cell = projection.cell;
  const f = projection.footprint;
  if (!cell || !f) return;

  const gradientRGB = style.gradientRGB ?? undefined;
  const exposure = typeof style.exposure === "number" && Number.isFinite(style.exposure) ? style.exposure : 1;
  const contrast = typeof style.contrast === "number" && Number.isFinite(style.contrast) ? style.contrast : 1;
  const rowBucket = particleRowBucket(f, projection);

  const t = ((typeof lifecycle.timeMs === 'number' ? lifecycle.timeMs : p.millis()) / 1000);
  const u = clamp01(style.liveAvg ?? 0.5);
  const snowSeed =
    (typeof identity.seed === "number")
      ? (identity.seed | 0)
      : (((f.r0 * 73856093) ^ (f.c0 * 19349663) ^ (f.w * 83492791) ^ (f.h * 29791)) >>> 0);

  // tile anchors
  const visualRow = f.r0 + f.h - 1;
  const { x: fpX, y: y0, w: fpW, h: fpH } = footprintToPx(f, projection);
  // Snow clouds are sky-like multi-row footprints, so size their body from the
  // depth row used by footprintToPx instead of the footprint's top row.
  const visualCellW = rowWidthAt(visualRow, projection);
  const wTop = f.w * visualCellW;
  const footprintCx = fpX + fpW / 2;
  const x0 = footprintCx - wTop / 2;
  const hTop = rowHeightAt(visualRow, projection);

  // Cloud visual center. Ground, cloud body, and particles all line up from here.
  const cx = footprintCx;
  const cy = y0 + hTop * 0.62;

  const baseAlpha = typeof style.alpha === "number" && Number.isFinite(style.alpha) ? style.alpha : 235;
  const anchorX = footprintCx;
  const anchorY = y0 + fpH;
  const appear = applyShapeMods({
    p,
    x: anchorX,
    y: anchorY,
    r: Math.min(fpW, fpH),
    opts: { alpha: baseAlpha, timeMs: lifecycle.timeMs, rootAppearK: lifecycle.rootAppearK, selectK: lifecycle.selectK },
  });
  const drawAlpha = typeof appear.alpha === "number" ? appear.alpha : baseAlpha;

  // Resolve ground visibility from the row/bucket knobs the runtime actually passes.
  let showGround = opts.showGround !== false; // default true
  if (
    showGround &&
    typeof opts.hideGroundAboveFrac === 'number' &&
    typeof projection.usedRows === 'number'
  ) {
    const frac = Math.max(0, Math.min(1, opts.hideGroundAboveFrac));
    const cutoffRow = Math.floor(projection.usedRows * frac);
    if (f.r0 <= cutoffRow) showGround = false;
  }
  if (
    showGround &&
    typeof opts.hideGroundBelowBucketT === 'number' &&
    rowBucket.t < opts.hideGroundBelowBucketT
  ) {
    showGround = false;
  }

  // Ground strip. It uses local coordinates so the cloud and strip stay aligned.
  if (showGround) {
    const baseH  = Math.max(4, Math.round(cell / 3));
    const kY     = resolveRangeValue(SGROUND.scaleY, u);
    const stripH = Math.round(baseH * kY);
    if (stripH > 0) {
    const bottomY = y0 + fpH;
    const topY    = bottomY - stripH;

    const gBlend  = resolveRangeValue(SGROUND.blendK, u);
    const gSatAmp = resolveRangeValue(SGROUND.satOscAmp, u);
    const gSatSpd = resolveRangeValue(SGROUND.satOscSpeed, u);
    const base    = oscillateSaturation(pal.ground, t, { amp: gSatAmp, speed: gSatSpd, phase: 0 });
    const mixed = gradientRGB ? blendRGB(base, gradientRGB, gBlend) : base;
    const groundLRange = darkMode ? [0.62, 0.78] : SGROUND.lightnessRange;
    let clamped   = clampBrightness(mixed, groundLRange[0], groundLRange[1]);
    clamped       = applyDepthTint(applySrgbExposureContrast(clamped, exposure, contrast), pass);

    const rTop = Math.round(cell * 0.06);

    p.push();
    p.translate(appear.x, appear.y);
    p.scale(appear.scaleX, appear.scaleY);
    p.translate(-anchorX, -anchorY);
    p.translate(cx, cy);
    p.noStroke();
    p.fill(clamped.r, clamped.g, clamped.b, drawAlpha);
      p.rect(
      (fpX - cx),
      (topY - cy),
      fpW,
      stripH,
      rTop, rTop, 0, 0
    );
    const groundLight = sampleDirectionalLightRect(
      { x: fpX, y: topY, w: fpW, h: stripH },
      style.lightCtx ?? null
    );
    const groundHighlight = mixRgb(clamped, groundLight.lightColor, 0.34);
    const groundShadow = mixRgb(clamped, groundLight.shadowColor, 0.24);
    paintPixelLightBands(
      p,
      { x: (fpX - cx), y: (topY - cy), w: fpW, h: stripH },
      groundLight,
      {
        alpha: drawAlpha,
        highlightColor: groundHighlight,
        shadowColor: groundShadow,
        corner: rTop,
        sideK: 0.34,
        topK: 0.26,
        shadowK: 0.16,
      }
    );
    p.pop();
    }
  }

  // Cloud geometry and tint.
  const wEnv     = wTop * resolveRangeValue(SCLOUD.widthEnv,  u);
  const hEnv     = hTop * resolveRangeValue(SCLOUD.heightEnv, u);
  const spreadX  = resolveRangeValue(SCLOUD.spreadX, u);
  const arcLift  = resolveRangeValue(SCLOUD.arcLift, u);
  const rBase    = hTop * resolveRangeValue(SCLOUD.rBaseK, u);
  const rJitter  = resolveRangeValue(SCLOUD.rJitter, u);
  const lobeCount = Math.max(3, Math.round(resolveRangeValue(SCLOUD.lobeCount, u)));

  const lobes = makeArchLobes(
    cx, cy, wEnv, hEnv,
    { count: lobeCount, spreadX, arcLift, rBase, rJitter, seed: 0 }
  );

  const cloudLight = sampleDirectionalLightRect(
    { x: x0, y: y0, w: wTop, h: hTop * 1.2 },
    style.lightCtx ?? null
  );

  const cloudBlend = resolveRangeValue(SCLOUD.blend, u);
  const cloudPalette = pickLightBandValue(pal.cloud, pal.cloudByLight, cloudLight.closenessK);
  const baseTint = gradientRGB
    ? blendRGB(cloudPalette, gradientRGB, cloudBlend)
    : cloudPalette;

  const sMax = Math.max(0, Math.min(1, resolveRangeValue(SCLOUD.sCap, u)));
  const { h, s, l } = rgbToHsl(baseTint);
  const capped = hslToRgb({ h, s: Math.min(s, sMax), l });

  let cloudRgb = oscillateSaturation(capped, t, {
    amp:   resolveRangeValue(SCLOUD.oscAmp, u),
    speed: resolveRangeValue(SCLOUD.oscSpeed, u),
    phase: 0,
  });
  const cloudLRange = darkMode ? [0.68, 0.82] : SCLOUD.lightnessRange;
  cloudRgb = clampBrightness(cloudRgb, cloudLRange[0], cloudLRange[1]);
  cloudRgb = applySrgbExposureContrast(cloudRgb, exposure, contrast);
  cloudRgb = mixRgb(cloudRgb, cloudLight.lightColor, 0.16 * cloudLight.overallK);
  cloudRgb = applyDepthTint(cloudRgb, pass);
  const cloudHighlight = mixRgb(cloudRgb, cloudLight.lightColor, 0.34);
  const cloudShadow = mixRgb(cloudRgb, cloudLight.shadowColor, 0.22);

  // Particles stay in screen-space motion; they are not part of the depth mask pass.
  const of     = Math.max(0, Math.min(1, resolveRangeValue(SNOW.emitterOverflowFrac, u)));
  const extraW = Math.round(wTop * of);
  const emitW  = wTop + extraW;
  const emitX  = x0 - Math.round(extraW / 2);
  const emitY  = y0 + hTop * 0.6;
  const snowRect = { x: emitX, y: emitY, w: emitW, h: hTop * 2.2 };
  // Wide snowfall needs a real side fade. The emitter culls at its rect edge,
  // so a 2px fade makes the right side feel clipped when the plume spreads out.
  const sideFadePx = Math.round(
    Math.max(
      SNOW.edgeFadePx.right,
      Math.min(28, Math.max(8, emitW * 0.075))
    )
  );

  const sxA = resolveRangeValue(SNOW.spawnX, 0), sxB = resolveRangeValue(SNOW.spawnX, 1);
  const syA = resolveRangeValue(SNOW.spawnY, 0), syB = resolveRangeValue(SNOW.spawnY, 1);
  const spawnX0 = Math.min(sxA, sxB);
  const spawnX1 = Math.max(sxA, sxB);
  const spawnY0 = Math.min(syA, syB);
  const spawnY1 = Math.max(syA, syB);

  const baseCount = Math.max(6, Math.floor(resolveRangeValue(SNOW.count, u)));

  const horizonScale = snowRowContextScale(rowBucket.t);
  const particleSizeK = particleDepthSizeScale(rowBucket);
  const spriteScale      = Math.max(1, (sprite.pixelScale ?? sprite.coreScaleMult ?? 1));
  const spriteLifeScale  = spriteScale > 1.7
    ? Math.pow(spriteScale, 1.25)
    : Math.pow(spriteScale, 5);
  const sizeK     = horizonScale.size * particleSizeK * Math.pow(spriteScale, 1.75);
  const speedK    = horizonScale.motion * spriteScale * 1.35;
  const gravityK  = horizonScale.motion * spriteScale * 1.35;
  const lifeK     = horizonScale.life * spriteLifeScale;
  const countK    = horizonScale.count * Math.sqrt(spriteScale);

  const sizeMin   = resolveRangeValue(SNOW.sizeMin, u) * sizeK;
  const sizeMax   = Math.max(sizeMin, resolveRangeValue(SNOW.sizeMax, u) * sizeK);
  const lifeMin   = Math.max(0.1, resolveRangeValue(SNOW.lifeMin, u) * lifeK);
  const lifeMax   = Math.max(lifeMin, resolveRangeValue(SNOW.lifeMax, u) * lifeK);
  const alpha     = Math.max(0, Math.min(255, Math.round(resolveRangeValue(SNOW.alpha, u))));

  const speedMin  = resolveRangeValue(SNOW.speedMin, u) * speedK;
  const speedMax  = Math.max(speedMin, resolveRangeValue(SNOW.speedMax, u) * speedK);
  const gravity   = resolveRangeValue(SNOW.gravity, u) * gravityK;
  const drag      = resolveRangeValue(SNOW.drag, u);
  const jPos      = resolveRangeValue(SNOW.jitterPos, u);
  const jAng      = resolveRangeValue(SNOW.jitterAngle, u);
  const spreadAng = resolveRangeValue(SNOW.spreadAngle, u);

  const blendK    = resolveRangeValue(SNOW.blendK, u);
  const satAmp    = resolveRangeValue(SNOW.satOscAmp, u);
  const satSpd    = resolveRangeValue(SNOW.satOscSpeed, u);

  let flakeBase  = oscillateSaturation(pal.flake, t, { amp: satAmp, speed: satSpd, phase: 0 });
  flakeBase = gradientRGB ? blendRGB(flakeBase, gradientRGB, blendK) : flakeBase;
  const flakeLRange = darkMode ? [0.7, 0.84] : SNOW.lightnessRange;
  flakeBase      = clampBrightness(flakeBase, flakeLRange[0], flakeLRange[1]);
  flakeBase      = applySrgbExposureContrast(flakeBase, exposure, contrast);
  if (sprite.disableParticleDepthTint !== true) {
    flakeBase = applyDepthTint(flakeBase, pass, 0.7);
  }

  const snowColor  = { r: flakeBase.r, g: flakeBase.g, b: flakeBase.b, a: alpha };
  const dt = Math.max(0.001, (p.deltaTime || 16) / 1000);

  stepAndDrawPuffs(p, {
    store: particles.particleStore,
    key: `snow:${String(f.r0)}:${String(f.c0)}:${String(f.w)}x${String(f.h)}`,
    rect: snowRect,

    dir: 'down',
    spreadAngle: spreadAng,
    speed: { min: speedMin, max: speedMax },
    gravity,
    drag,
    accel: { x: 0, y: 0 },

    spawn: { x0: spawnX0, x1: spawnX1, y0: spawnY0, y1: spawnY1 },
    jitter: { pos: jPos, velAngle: jAng },

    count: Math.max(6, Math.floor(baseCount * countK)),
    size: { min: sizeMin, max: sizeMax },
    sizeHz: SNOW.sizeHz,

    lifetime: { min: lifeMin, max: lifeMax },
    fadeInFrac: SNOW.fadeInFrac,
    fadeOutFrac: SNOW.fadeOutFrac,
    warmStartSec: SNOW.warmStartSec,
    edgeFadePx: { ...SNOW.edgeFadePx, left: sideFadePx, right: sideFadePx },

    color: snowColor,
    depthAlpha: particleDepthAlpha(rowBucket),
    respawn: true,
  }, dt);

  // Cloud body.
  p.push();
  p.translate(appear.x, appear.y);
  p.scale(appear.scaleX, appear.scaleY);
  p.translate(-anchorX, -anchorY);
  p.translate(cx, cy);
  p.noStroke();
  p.fill(cloudRgb.r, cloudRgb.g, cloudRgb.b, drawAlpha);
  const cloudAlpha = drawAlpha;
  const wobbleAmpX = Math.max(0.8, hTop * 0.045);
  const wobbleAmpY = Math.max(0.5, hTop * 0.035);
  const wobbleAmpS = 0.045;
  for (const l of lobes) {
    const { dx: ldx, dy: ldy, sc } = displacementOsc(t, l.i, {
      ampX: wobbleAmpX,
      ampY: wobbleAmpY,
      ampScale: wobbleAmpS,
      freqX: 0.16,
      freqY: 0.12,
      freqScale: 0.10,
      seed: snowSeed,
    });
    const radius = l.r * sc;
    const lx = l.x - cx + ldx;
    const ly = l.y - cy + ldy;
    p.circle(lx, ly, radius * 2);
    if (cloudLight.overallK > 0.01) {
      const offX = cloudLight.xBias * l.r * 0.22;
      const offY = cloudLight.yBias * l.r * 0.18;
      const shadowK = clamp01((cloudLight.closenessK - 0.22) / 0.46);
      p.fill(
        cloudHighlight.r,
        cloudHighlight.g,
        cloudHighlight.b,
        Math.round(cloudAlpha * 0.18 * Math.max(cloudLight.leftK, cloudLight.rightK, cloudLight.topK))
      );
      p.circle(lx + offX, ly + offY, radius * 2 * 0.62);
      p.fill(
        cloudShadow.r,
        cloudShadow.g,
        cloudShadow.b,
        Math.round(cloudAlpha * 0.10 * shadowK * Math.max(cloudLight.leftK, cloudLight.rightK))
      );
      p.circle(lx - offX * 0.9, ly - offY * 0.5, radius * 2 * 0.54);
      p.fill(cloudRgb.r, cloudRgb.g, cloudRgb.b, cloudAlpha);
    }
  }
  p.pop();
}

