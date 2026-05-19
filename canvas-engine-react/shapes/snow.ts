// src/canvas-engine/shapes/snow.js
import {
  clamp01,
  val,
  blendRGB,
  rgbToHsl,
  hslToRgb,
  clampBrightness,
  oscillateSaturation,
  makeArchLobes,
  displacementOsc,
  stepAndDrawPuffs,
  particleBucketRange,
  particleRowBucket,
  footprintToPx,
  rowHeightAt,
  rowWidthAt,
  sampleDirectionalLightRect,
  pickLightBandValue,
  mixRgb,
  paintPixelLightBands,
} from "../modifiers/index";
import type { LightClosenessBandMap, RGB } from "../modifiers/index";
import type { ShapeCanvas, ShapeDrawOptions, ShapePalette } from "./types";
import { applyExposureContrast } from "./shared/color";

type NumberRange = [number, number];

interface SnowPalette extends ShapePalette {
  cloud: RGB;
  cloudByLight?: LightClosenessBandMap<RGB>;
  flake: RGB;
  ground: RGB;
}

interface SnowOptions extends ShapeDrawOptions<SnowPalette> {
  appearX?: number;
  appearY?: number;
  appearScaleX?: number;
  appearScaleY?: number;
  cloudAlpha?: number;
  showGround?: boolean;
  hideGroundAboveRow?: number;
  hideGroundAboveFrac?: number;
  hideGroundBelowBucketT?: number;
}

const SNOW_BASE_PALETTE: SnowPalette = {
  cloud:  { r: 248, g: 250, b: 255 },
  flake:  { r: 228, g: 235, b: 247 },
  ground: { r: 232, g: 238, b: 244 },
};

const SNOW_DARK_PALETTE: SnowPalette = {
  cloud:  { r: 182, g: 189, b: 220 },
  cloudByLight: {
    far:  { r: 255, g: 122, b: 148 },
    mid:  { r: 192, g: 179, b: 210 },
    near: { r: 232, g: 238, b: 255 },
  },
  flake:  { r: 160, g: 174, b: 208 },
  ground: { r: 148, g: 162, b: 194 },
};

const SNOW_FAR_DEPTH_TINT: { cloud: { light: RGB; dark: RGB }; flake: { light: RGB; dark: RGB } } = {
  cloud: {
    light: { r: 255, g: 222, b: 230 },
    dark:  { r: 255, g: 150, b: 174 },
  },
  flake: {
    light: { r: 255, g: 228, b: 236 },
    dark:  { r: 248, g: 184, b: 200 },
  },
};

/* Cloud tuning */
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
  edgeFadePx: { left: number; right: number; top: number; bottom: number };
  sizeHz: number;
  blendK: NumberRange;
  satOscAmp: NumberRange;
  satOscSpeed: NumberRange;
  lightnessRange: NumberRange;
};

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
  const pal = opts.palette ?? (opts.darkMode ? SNOW_DARK_PALETTE : SNOW_BASE_PALETTE);
  const cell = opts.cell;
  const f = opts.footprint;
  if (!cell || !f) return;

  const gradientRGB = opts.gradientRGB ?? undefined;
  const exposure = typeof opts.exposure === "number" && Number.isFinite(opts.exposure) ? opts.exposure : 1;
  const contrast = typeof opts.contrast === "number" && Number.isFinite(opts.contrast) ? opts.contrast : 1;
  const rowBucket = particleRowBucket(f, opts);
  const farDepthK = Math.pow(clamp01(1 - rowBucket.t), 1.15);

  const t = ((typeof opts.timeMs === 'number' ? opts.timeMs : p.millis()) / 1000);
  const u = clamp01(opts.liveAvg ?? 0.5);
  const snowSeed =
    (typeof opts.seed === "number")
      ? (opts.seed | 0)
      : (((f.r0 * 73856093) ^ (f.c0 * 19349663) ^ (f.w * 83492791) ^ (f.h * 29791)) >>> 0);

  // tile anchors
  const { x: fpX, y: y0, w: fpW, h: fpH } = footprintToPx(f, opts);
  const topCellW = rowWidthAt(f.r0, opts);
  const wTop = f.w * topCellW;
  const footprintCx = fpX + fpW / 2;
  const x0 = footprintCx - wTop / 2;
  const hTop = rowHeightAt(f.r0, opts);

  // cloud visual center (also the local origin for appear transforms)
  const cx = footprintCx;
  const cy = y0 + hTop * 0.62;

  /* ───────── appear (shared by ground + cloud) ───────── */
  const appear = {
    alpha: typeof opts.alpha === "number" && Number.isFinite(opts.alpha) ? opts.alpha : 235,
    x: (opts.appearX ?? cx),
    y: (opts.appearY ?? cy),
    scaleX: typeof opts.appearScaleX === "number" && Number.isFinite(opts.appearScaleX) ? opts.appearScaleX : 1,
    scaleY: typeof opts.appearScaleY === "number" && Number.isFinite(opts.appearScaleY) ? opts.appearScaleY : 1,
  };
  const aDraw = appear.alpha;
  const dx = appear.x - cx;
  const dy = appear.y - cy;

  /* ───────── resolve ground visibility knobs ───────── */
  let showGround = opts.showGround !== false; // default true
  if (showGround && typeof opts.hideGroundAboveRow === 'number') {
    if (f.r0 <= opts.hideGroundAboveRow) showGround = false;
  }
  if (
    showGround &&
    typeof opts.hideGroundAboveFrac === 'number' &&
    typeof opts.usedRows === 'number'
  ) {
    const frac = Math.max(0, Math.min(1, opts.hideGroundAboveFrac));
    const cutoffRow = Math.floor(opts.usedRows * frac);
    if (f.r0 <= cutoffRow) showGround = false;
  }
  if (
    showGround &&
    typeof opts.hideGroundBelowBucketT === 'number' &&
    rowBucket.t < opts.hideGroundBelowBucketT
  ) {
    showGround = false;
  }

  /* ───────── GROUND STRIP (translated + scaled with appear) ───────── */
  if (showGround) {
    const baseH  = Math.max(4, Math.round(cell / 3));
    const kY     = val(SGROUND.scaleY, u);
    const stripH = Math.round(baseH * kY);
    if (stripH > 0) {
    const bottomY = y0 + fpH;
    const topY    = bottomY - stripH;

    const gBlend  = val(SGROUND.blendK, u);
    const gSatAmp = val(SGROUND.satOscAmp, u);
    const gSatSpd = val(SGROUND.satOscSpeed, u);
    const base    = oscillateSaturation(pal.ground, t, { amp: gSatAmp, speed: gSatSpd, phase: 0 });
    const mixed = gradientRGB ? blendRGB(base, gradientRGB, gBlend) : base;
    const groundLRange = opts.darkMode ? [0.62, 0.78] : SGROUND.lightnessRange;
    let clamped   = clampBrightness(mixed, groundLRange[0], groundLRange[1]);
    clamped       = applyExposureContrast(clamped, exposure, contrast);

    const rTop = Math.round(cell * 0.06);

    // draw in local space around (cx,cy) so appear scale feels natural
    p.push();
    p.translate(appear.x, appear.y);
    p.scale(appear.scaleX, appear.scaleY);
    p.noStroke();
    p.fill(clamped.r, clamped.g, clamped.b, aDraw); // ← use appear alpha
      p.rect(
      (fpX - cx),
      (topY - cy),
      fpW,
      stripH,
      rTop, rTop, 0, 0
    );
    const groundLight = sampleDirectionalLightRect(
      { x: fpX, y: topY, w: fpW, h: stripH },
      opts.lightCtx ?? null
    );
    const groundHighlight = mixRgb(clamped, groundLight.lightColor, 0.34);
    const groundShadow = mixRgb(clamped, groundLight.shadowColor, 0.24);
    paintPixelLightBands(
      p,
      { x: (fpX - cx), y: (topY - cy), w: fpW, h: stripH },
      groundLight,
      {
        alpha: aDraw,
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

  /* ───────── CLOUD GEOMETRY / TINT ───────── */
  const wEnv     = wTop * val(SCLOUD.widthEnv,  u);
  const hEnv     = hTop * val(SCLOUD.heightEnv, u);
  const spreadX  = val(SCLOUD.spreadX, u);
  const arcLift  = val(SCLOUD.arcLift, u);
  const rBase    = hTop * val(SCLOUD.rBaseK, u);
  const rJitter  = val(SCLOUD.rJitter, u);
  const lobeCount = Math.max(3, Math.round(val(SCLOUD.lobeCount, u)));

  const lobes = makeArchLobes(
    cx, cy, wEnv, hEnv,
    { count: lobeCount, spreadX, arcLift, rBase, rJitter, seed: 0 }
  );

  const cloudLight = sampleDirectionalLightRect(
    { x: x0, y: y0, w: wTop, h: hTop * 1.2 },
    opts.lightCtx ?? null
  );

  const cloudBlend = val(SCLOUD.blend, u);
  const cloudPalette = pickLightBandValue(pal.cloud, pal.cloudByLight, cloudLight.closenessK);
  let baseTint = gradientRGB
    ? blendRGB(cloudPalette, gradientRGB, cloudBlend)
    : cloudPalette;
  if (farDepthK > 0.001) {
    const farCloudTint = opts.darkMode ? SNOW_FAR_DEPTH_TINT.cloud.dark : SNOW_FAR_DEPTH_TINT.cloud.light;
    baseTint = mixRgb(baseTint, farCloudTint, (opts.darkMode ? 0.22 : 0.12) * farDepthK);
  }

  const sMax = Math.max(0, Math.min(1, val(SCLOUD.sCap, u)));
  const { h, s, l } = rgbToHsl(baseTint);
  const capped = hslToRgb({ h, s: Math.min(s, sMax), l });

  let cloudRgb = oscillateSaturation(capped, t, {
    amp:   val(SCLOUD.oscAmp, u),
    speed: val(SCLOUD.oscSpeed, u),
    phase: 0,
  });
  const cloudLRange = opts.darkMode ? [0.68, 0.82] : SCLOUD.lightnessRange;
  cloudRgb = clampBrightness(cloudRgb, cloudLRange[0], cloudLRange[1]);
  cloudRgb = applyExposureContrast(cloudRgb, exposure, contrast);
  cloudRgb = mixRgb(cloudRgb, cloudLight.lightColor, 0.16 * cloudLight.overallK);
  const cloudHighlight = mixRgb(cloudRgb, cloudLight.lightColor, 0.34);
  const cloudShadow = mixRgb(cloudRgb, cloudLight.shadowColor, 0.22);

  /* ───────── PARTICLES (translate only; no scale) ───────── */
  const of     = Math.max(0, Math.min(1, val(SNOW.emitterOverflowFrac, u)));
  const extraW = Math.round(wTop * of);
  const emitW  = wTop + extraW;
  const emitX  = (x0 - Math.round(extraW / 2)) + dx; // translation only
  const emitY  = (y0 + hTop * 0.6) + dy;             // translation only
  const snowRect = { x: emitX, y: emitY, w: emitW, h: hTop * 2.2 };

  const sxA = val(SNOW.spawnX, 0), sxB = val(SNOW.spawnX, 1);
  const syA = val(SNOW.spawnY, 0), syB = val(SNOW.spawnY, 1);
  const spawnX0 = Math.min(sxA, sxB);
  const spawnX1 = Math.max(sxA, sxB);
  const spawnY0 = Math.min(syA, syB);
  const spawnY1 = Math.max(syA, syB);

  const baseCount = Math.max(6, Math.floor(val(SNOW.count, u)));

  const horizonScale = snowRowContextScale(rowBucket.t);
  const spriteScale      = Math.max(1, (opts.pixelScale ?? opts.coreScaleMult ?? 1));
  const sizeK     = horizonScale.size * Math.pow(spriteScale, 1.75);
  const speedK    = horizonScale.motion * spriteScale * 1.35;
  const gravityK  = horizonScale.motion * spriteScale * 1.35;
  const lifeK     = horizonScale.life * Math.pow(spriteScale, 5);
  const countK    = horizonScale.count * Math.sqrt(spriteScale);

  const sizeMin   = val(SNOW.sizeMin, u) * sizeK;
  const sizeMax   = Math.max(sizeMin, val(SNOW.sizeMax, u) * sizeK);
  const lifeMin   = Math.max(0.1, val(SNOW.lifeMin, u) * lifeK);
  const lifeMax   = Math.max(lifeMin, val(SNOW.lifeMax, u) * lifeK);
  const alpha     = Math.max(0, Math.min(255, Math.round(val(SNOW.alpha, u))));

  const speedMin  = val(SNOW.speedMin, u) * speedK;
  const speedMax  = Math.max(speedMin, val(SNOW.speedMax, u) * speedK);
  const gravity   = val(SNOW.gravity, u) * gravityK;
  const drag      = val(SNOW.drag, u);
  const jPos      = val(SNOW.jitterPos, u);
  const jAng      = val(SNOW.jitterAngle, u);
  const spreadAng = val(SNOW.spreadAngle, u);

  const blendK    = val(SNOW.blendK, u);
  const satAmp    = val(SNOW.satOscAmp, u);
  const satSpd    = val(SNOW.satOscSpeed, u);

  let flakeBase  = oscillateSaturation(pal.flake, t, { amp: satAmp, speed: satSpd, phase: 0 });
  flakeBase = gradientRGB ? blendRGB(flakeBase, gradientRGB, blendK) : flakeBase;
  if (farDepthK > 0.001) {
    const farFlakeTint = opts.darkMode ? SNOW_FAR_DEPTH_TINT.flake.dark : SNOW_FAR_DEPTH_TINT.flake.light;
    flakeBase = mixRgb(flakeBase, farFlakeTint, (opts.darkMode ? 0.12 : 0.06) * farDepthK);
  }
  const flakeLRange = opts.darkMode ? [0.7, 0.84] : SNOW.lightnessRange;
  flakeBase      = clampBrightness(flakeBase, flakeLRange[0], flakeLRange[1]);
  flakeBase      = applyExposureContrast(flakeBase, exposure, contrast);

  const snowColor  = { r: flakeBase.r, g: flakeBase.g, b: flakeBase.b, a: alpha };
  const dt = Math.max(0.001, (p.deltaTime || 16) / 1000);

  stepAndDrawPuffs(p, {
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
    edgeFadePx: SNOW.edgeFadePx,

    color: snowColor,
    respawn: true,
  }, dt);

  /* ───────── CLOUD (same appear transform; scalable) ───────── */
  p.push();
  p.translate(appear.x, appear.y);
  p.scale(appear.scaleX, appear.scaleY);
  p.noStroke();
  p.fill(
    cloudRgb.r,
    cloudRgb.g,
    cloudRgb.b,
    typeof opts.cloudAlpha === "number" && Number.isFinite(opts.cloudAlpha) ? opts.cloudAlpha : aDraw
  );
  const cloudAlpha = typeof opts.cloudAlpha === "number" && Number.isFinite(opts.cloudAlpha) ? opts.cloudAlpha : aDraw;
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

export default drawSnow;
