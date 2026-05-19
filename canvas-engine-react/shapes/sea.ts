import {
  clamp01,
  val,
  mix,
  blendRGB,
  blendRGBGamma,
  clampSaturation,
  clampBrightness,
  oscillateSaturation,
  stepAndDrawPuffs,
  applyShapeMods,
  footprintToPx,
} from "../modifiers/index";
import type { RGB } from "../modifiers/index";
import type { ShapeCanvas, ShapeDrawOptions, ShapePalette } from "./types";

type NR = [number, number];

interface SeaPalette extends ShapePalette {
  top: RGB;
  bottom: RGB;
}

// base palettes
const SEA_BASE_PALETTE: SeaPalette = {
  top:    { r: 138, g: 196, b: 234 },
  bottom: { r:  25, g: 124, b: 179 },
};

const SEA_DARK_PALETTE: SeaPalette = {
  top:    { r: 76, g: 124, b: 179 },
  bottom: { r: 14, g: 78,  b: 137 },
};

const SEA_WARM_PALETTE: SeaPalette = {
  top:    { r: 148, g: 210, b: 218 },
  bottom: { r:  48, g: 140, b: 168 },
};

const SEA_COOL_PALETTE: SeaPalette = {
  top:    { r: 118, g: 182, b: 228 },
  bottom: { r:  12, g:  98, b: 168 },
};

// grass for composite bowl
const GRASS_BASE: RGB = { r: 150, g: 190, b: 150 };
const GRASS_DARK: RGB  = { r: 72,  g: 102, b: 130 };

// tuning (override with opts.tuning)
const SEA_TUNING = {
  span: { forceTilesX: 2, leaderOnly: true },

  gradient: {
    gamma: true,
    blendTop:    [0.10, 0.05] as NR,
    blendBottom: [0.10, 0.05] as NR,
  },

  colorClamp: {
    sat:    { min: 0.10, max: 0.85 },
    bright: { min: 0.40, max: 0.80 },
    strength: 1.0,
  },

  scale: {
    baseYRange:  [0.88, 0.45] as NR,
    oscHzRange:  [0.45, 0.85] as NR,
    oscAmpRange: [0.04, 0.008] as NR,
  },

  appear: { kRange: [0.82, 1.0] as NR, easing: 'cubic' as 'cubic' | 'linear' },

  overflow: { allow: false, extraTopPx: 0, extraBottomPx: 0 },

  opacity:   { mul: 0.88 },
  antialias: { expandPx: 2 },

  topBorder: {
    enable: false,
    topLinePx:    1,
    topLineAlpha: 0.28,
    topLineMix:   0.25,
  },

  foam: {
    enable: true,
    band:   { heightPx: 10, offsetTopPx: 4, oscAmpPx: 3, oscHzRange: [0.12, 0.25] as NR },
    motion: { dir: 'up' as const, spreadAngle: 0.35, speedPxSec: [10, 24] as NR, gravity: -8, drag: 0.8, jitterPos: 0.5, jitterAngle: 0.15 },
    pool:   { count: 18, sizePx: [0.8, 1.8] as NR, sizeHz: 6, lifetimeSec: [0.8, 1.6] as NR, fadeInFrac: 0.2, fadeOutFrac: 0.35 },
    edgeFadePx: { left: 6, right: 6, top: 0, bottom: 10 },
    color:  { base: { r: 250, g: 252, b: 255, a: 200 }, varyBySize: true },
  },

  // SEA_TUNING.bowl
  bowl: {
    enable: true,
    thicknessK:  0.2,
    baseFrac:    0.18,
    postTopFrac: 0.24,
    colWidthK:   1.00,
    cornerK:     0.10,
    mobile: {
      cellMax:    28,
      thicknessK: 0.1,
      baseFrac:   0.12,
      postTopFrac:0.08,
      colWidthK:  0.85,
      cornerK:    0.12,
    },
    color:      GRASS_BASE,
    grassBlend: { colorBlend: [0.20, 0.34] as NR, satRange: [0.00, 0.16] as NR, brightRange: [0.35, 0.90] as NR },
    alphaMul:   1.0,
    // optional tuning fields callers may provide via opts.tuning.bowl
    pieceRadiusPx:    undefined as number | undefined,
    baseOverlapPx:    undefined as number | undefined,
    postBottomLiftPx: undefined as number | undefined,
  },

  waterBottomRadiusPx: 10,

  // Horizon cap rectangle (drawn without tile clip)
  capRect: {
    enable:         true,
    widthTiles:     0.90,
    heightTiles:    0.45,
    cornerPx:       6,
    followOffsetPx: 0,
    color: {
      top:    { r: 245, g: 248, b: 252, a: 255 },
      bottom: { r: 210, g: 230, b: 252, a: 255 },
    },
    scaleMap: { uMin: 0.2, uMax: 0.85, xMin: 0.4, xMax: 1, yMin: 0.3, yMax: 1.22 },
    alphaMul: 1.0,
    satOsc:   { amp: 0.08, speed: 0.16, phase: 0 },
  },

  // Spill with particle-2 (narrow spawn band near surface + tall corridor)
  spill: {
    enable: true,

    // global horizontal offset for the WHOLE spill block (in tiles)
    offsetTilesX: 0.25,

    // micro per-side nudges (px)
    leftNudgePx:  0,
    rightNudgePx: 0,

    count:  34,
    sizePx: [1.0, 2.2] as NR,

    leftSpeedPxSec:  [60, 120] as NR,
    rightSpeedPxSec: [60, 120] as NR,

    gravity: 360,
    drag:    6,
    lifetimeSec: [1.2, 2.0] as NR,

    spillPx: 40,

    fadeInFrac:  0.15,
    fadeOutFrac: 0.35,
    edgeFadePx:  { left: 2, right: 8, top: 8, bottom: 36 },

    coneAccelX:  120,
    spreadAngle: 0.45,

    leftSpawnFracX:  [0.70, 0.96] as NR,
    rightSpawnFracX: [0.00, 0.20] as NR,

    liveGate: { min: 0.25, max: 0, soft: 0.12 },

    leftEdgeFadeLeftPx: 2,
    leftLifetimeSec:    [1.2, 2.0] as NR,
    leftExtraRoomPx:    24,

    mobile: { cellMax: 28, leftNudgePx: 8, rightNudgePx: -4 },
  },
};

interface SeaOptions extends ShapeDrawOptions<SeaPalette> {
  tuning?: Partial<typeof SEA_TUNING>;
  allowForcedSpan?: boolean;
  spanLeader?: boolean;
  oscHz?: number;
  oscAmp?: number;
  foamKey?: string;
  blendTopK?: number;
  blendBottomK?: number;
}

// helpers
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function cssRgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${String(r)},${String(g)},${String(b)},${String(a)})`;
}

// Map a world-space Y to the current water gradient color (topRGB→bottomRGB)
function seaRGBAtY(y: number, topY: number, bottomY: number, topRGB: RGB, bottomRGB: RGB): RGB {
  const t = Math.max(0, Math.min(1, (y - topY) / Math.max(1e-6, (bottomY - topY))));
  return {
    r: Math.round(topRGB.r + (bottomRGB.r - topRGB.r) * t),
    g: Math.round(topRGB.g + (bottomRGB.g - topRGB.g) * t),
    b: Math.round(topRGB.b + (bottomRGB.b - topRGB.b) * t),
  };
}

// soft gate helper
function smoothstep01(t: number): number { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); }
function liveWindowK(u: number, a: number, b: number, s = 0): number {
  let lo = a, hi = b;
  if (lo > hi) { [lo, hi] = [hi, lo]; }
  if (s <= 0) return (u >= lo && u <= hi) ? 1 : 0;
  const inL = smoothstep01((u - (lo - s)) / s);
  const inR = smoothstep01(((hi + s) - u) / s);
  return Math.max(0, Math.min(1, Math.min(inL, inR)));
}

export function drawSea(p: ShapeCanvas, _x: number, _y: number, _r: number, opts: SeaOptions = {}): void {
  const pal = opts.palette ?? (opts.darkMode ? SEA_DARK_PALETTE
    : opts.paletteTheme === 'warm' ? SEA_WARM_PALETTE
    : opts.paletteTheme === 'cool' ? SEA_COOL_PALETTE
    : SEA_BASE_PALETTE);
  const grassPal = opts.darkMode ? GRASS_DARK : GRASS_BASE;
  const cell = opts.cell;
  const cellW = opts.cellW ?? cell;
  const cellH = opts.cellH ?? cell;
  const f = opts.footprint;
  if (!cell || !f) return;

  // Detect "sprite mode"
  // - auto when CanvasAnimatedTexture / Frozen path sets fitToFootprint: true
  // - or explicitly via opts.spriteMode
  const isSprite = (opts.fitToFootprint ?? false) || (opts.spriteMode ?? false);
  const pxK = isSprite ? Math.max(1, opts.coreScaleMult ?? opts.pixelScale ?? 1) : 1;

  // merge tunables
  const OT = opts.tuning ?? {};
  const T = { ...SEA_TUNING, ...OT };
  T.span        = { ...SEA_TUNING.span,        ...(OT.span        ?? {}) };
  T.gradient    = { ...SEA_TUNING.gradient,    ...(OT.gradient    ?? {}) };
  T.colorClamp  = { ...SEA_TUNING.colorClamp,  ...(OT.colorClamp  ?? {}) };
  T.scale       = { ...SEA_TUNING.scale,       ...(OT.scale       ?? {}) };
  T.appear      = { ...SEA_TUNING.appear,      ...(OT.appear      ?? {}) };
  T.overflow    = { ...SEA_TUNING.overflow,    ...(OT.overflow    ?? {}) };
  T.opacity     = { ...SEA_TUNING.opacity,     ...(OT.opacity     ?? {}) };
  T.antialias   = { ...SEA_TUNING.antialias,   ...(OT.antialias   ?? {}) };
  T.topBorder   = { ...SEA_TUNING.topBorder,   ...(OT.topBorder   ?? {}) };

  // foam
  T.foam            = { ...SEA_TUNING.foam,            ...(OT.foam            ?? {}) };
  T.foam.band       = { ...SEA_TUNING.foam.band,       ...(OT.foam?.band      ?? {}) };
  T.foam.motion     = { ...SEA_TUNING.foam.motion,     ...(OT.foam?.motion    ?? {}) };
  T.foam.pool       = { ...SEA_TUNING.foam.pool,       ...(OT.foam?.pool      ?? {}) };
  T.foam.edgeFadePx = { ...SEA_TUNING.foam.edgeFadePx, ...(OT.foam?.edgeFadePx ?? {}) };
  T.foam.color      = { ...SEA_TUNING.foam.color,      ...(OT.foam?.color     ?? {}) };

  // bowl
  T.bowl            = { ...SEA_TUNING.bowl,            ...(OT.bowl            ?? {}) };
  T.bowl.grassBlend = { ...SEA_TUNING.bowl.grassBlend, ...(OT.bowl?.grassBlend ?? {}) };

  const tSec = (typeof opts.timeMs === 'number' ? opts.timeMs : p.millis()) / 1000;
  const u = clamp01(opts.liveAvg ?? 0.5);

  const baseAlpha = typeof opts.alpha === 'number' ? opts.alpha : 235;
  const alphaMulGlobal = clamp01(T.opacity.mul);

  // forced span logic
  // In sprite mode we never fake-span; keep it local to the tile
  const forceX = Math.max(1, (T.span.forceTilesX | 0));
  const canFakeSpanCanvas = (opts.allowForcedSpan ?? false) && forceX > 1 && f.w < forceX;
  const canFakeSpan = isSprite ? false : canFakeSpanCanvas;
  const spanTilesX = canFakeSpan ? forceX : f.w;
  const leaderOnly = canFakeSpan ? T.span.leaderOnly : false;
  const isLeader =
    opts.spanLeader === true ? true :
    leaderOnly ? ((f.c0 % spanTilesX) === 0) : true;
  if (!isLeader) return;

  // tile rect
  const x0 = f.c0 * (cellW ?? 0);
  const { y: y0, h } = footprintToPx(f, opts);
  const w  = Math.max(f.w, spanTilesX) * (cellW ?? 0);

  const cx = x0 + w / 2;
  const bottomY = y0 + h;

  // WATER Y-scale
  const baseScaleY = val(T.scale.baseYRange, u);
  const oscHz  = Math.max(0, opts.oscHz  ?? val(T.scale.oscHzRange,  u));
  const oscAmp = Math.max(0, opts.oscAmp ?? val(T.scale.oscAmpRange, u));
  const oscT   = 0.5 + 0.5 * Math.sin(tSec * (oscHz * 2 * Math.PI));
  const oscScaleY = mix(1 - oscAmp, 1 + oscAmp, oscT);
  const waterScaleY = Math.max(0, Math.min(1.25, baseScaleY * oscScaleY));

  // WATER colors (gamma + clamp)
  const useGamma = T.gradient.gamma;
  const blendTopK    = clamp01(opts.blendTopK    ?? val(T.gradient.blendTop,    u));
  const blendBottomK = clamp01(opts.blendBottomK ?? val(T.gradient.blendBottom, u));
  const blender = useGamma ? blendRGBGamma : blendRGB;
  let topRGB    = opts.gradientRGB ? blender(pal.top,    opts.gradientRGB, blendTopK)    : pal.top;
  let bottomRGB = opts.gradientRGB ? blender(pal.bottom, opts.gradientRGB, blendBottomK) : pal.bottom;

  const clampStrength = clamp01(T.colorClamp.strength);
  if (clampStrength > 0) {
    const { min: sMin, max: sMax } = T.colorClamp.sat;
    const { min: lMin, max: lMax } = T.colorClamp.bright;
    const clampOnce = (c: RGB): RGB => clampBrightness(
      clampSaturation(c, sMin, sMax, clampStrength),
      lMin, lMax, clampStrength
    );
    topRGB    = clampOnce(topRGB);
    bottomRGB = clampOnce(bottomRGB);
  }

  const ctx = p.drawingContext;

  // geometry in group space
  const extraTop    = Math.max(0, T.overflow.extraTopPx    || 0);
  const extraBottom = Math.max(0, T.overflow.extraBottomPx || 0);
  const expand = Math.max(0, T.antialias.expandPx || 0);
  const L0 = -w / 2 - expand / 2;
  const W0 = w + expand;
  const Ttop0 = -h - extraTop;
  const H0 = h + extraTop + extraBottom;

  // GROUP APPEAR transform
  const env = applyShapeMods({
    p,
    x: cx,
    y: bottomY,
    r: Math.min(w, h),
    opts: { alpha: baseAlpha * alphaMulGlobal, timeMs: opts.timeMs, liveAvg: u, rootAppearK: opts.rootAppearK },
    mods: { appear: { scaleFrom: 0.0, alphaFrom: 0.0, anchor: 'bottom-center', ease: (T.appear.easing === 'linear') ? 'linear' : 'cubic' }, sizeOsc: { mode: 'none' } }
  });

  const drawAlpha = (typeof env.alpha === 'number') ? env.alpha : (baseAlpha * alphaMulGlobal);
  const aFactor = Math.max(0, Math.min(255, Math.round(drawAlpha))) / 255;

  // Begin group transform; clip the tile
  p.push();
  p.translate(env.x, env.y);
  p.scale(env.scaleX, env.scaleY);
  p.translate(-cx, -bottomY);

  // In sprite mode we force clip so nothing spills outside the texture
  const wantClip = isSprite ? true : !T.overflow.allow;
  if (wantClip) { ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip(); }

  // 1) WATER body (Y-scaled)
  p.push();
  p.translate(cx, bottomY);
  p.scale(1, waterScaleY);

  const rTop = Math.min(6, Math.max(1, Math.round(cell * 0.06)));
  {
    const x = L0, y = Ttop0, ww = W0, hh = H0;
    ctx.save();
    ctx.beginPath();
    roundedRect(ctx, x, y, ww, hh, rTop);
    ctx.clip();
    const OVER = 4;
    const gy0 = y - OVER;
    const gy1 = y + hh + OVER;
    const g = ctx.createLinearGradient(0, gy0, 0, gy1);
    g.addColorStop(0, cssRgba(topRGB.r,    topRGB.g,    topRGB.b,    aFactor));
    g.addColorStop(1, cssRgba(bottomRGB.r, bottomRGB.g, bottomRGB.b, aFactor));
    ctx.fillStyle = g;
    ctx.fillRect(x - 2, gy0, ww + 4, (gy1 - gy0));
    ctx.restore();
  }

  // Foam (sticks to water)
  if (T.foam.enable) {
    const bandH   = Math.max(1, T.foam.band.heightPx);
    const bandOff = Math.max(0, T.foam.band.offsetTopPx);
    const foamHz  = val(T.foam.band.oscHzRange, u);
    const yOsc    = Math.sin(tSec * foamHz * 2 * Math.PI) * (T.foam.band.oscAmpPx || 0);

    const rect = { x: L0, y: Ttop0 - bandOff + yOsc, w: W0, h: bandH };

    const speedLo = Array.isArray(T.foam.motion.speedPxSec) ? T.foam.motion.speedPxSec[0] : 10;
    const speedHi = Array.isArray(T.foam.motion.speedPxSec) ? T.foam.motion.speedPxSec[1] : speedLo;

    const sizeLo  = (Array.isArray(T.foam.pool.sizePx) ? T.foam.pool.sizePx[0] : 1) * pxK;
    const sizeHi  = Math.max(sizeLo, (Array.isArray(T.foam.pool.sizePx) ? T.foam.pool.sizePx[1] : sizeLo) * pxK);

    const lifeLo  = Array.isArray(T.foam.pool.lifetimeSec) ? T.foam.pool.lifetimeSec[0] : 1;
    const lifeHi  = Array.isArray(T.foam.pool.lifetimeSec) ? T.foam.pool.lifetimeSec[1] : 1.6;

    const base = T.foam.color.base;
    const colorFn = (pr: { size: number }): { r: number; g: number; b: number; a: number } => {
      const aFoam = Math.round(base.a * aFactor);
      if (!T.foam.color.varyBySize || sizeHi === sizeLo) return { ...base, a: aFoam };
      const k = clamp01((pr.size - sizeLo) / Math.max(1e-6, sizeHi - sizeLo));
      const d = 5;
      return { r: base.r - d * (1 - k), g: base.g - d * (1 - k), b: base.b - d * (1 - k), a: aFoam };
    };

    const dtSec =
      (typeof opts.deltaSec === 'number' && opts.deltaSec > 0)
        ? opts.deltaSec
        : (p.deltaTime ? Math.max(1/120, p.deltaTime / 1000) : 1/60);

    stepAndDrawPuffs(p, {
      key: (opts.foamKey ?? `seafoam:${String(f.r0)}:${String(f.c0)}:${String(spanTilesX)}x${String(f.h)}`) + (isSprite ? ':spr' : ''),
      rect,
      dir: T.foam.motion.dir,
      spreadAngle: T.foam.motion.spreadAngle,
      spawnMode: 'stratified',
      respawnStratified: true,
      spawn: { x0: 0, x1: 1, y0: 0, y1: 1 },
      speed:  { min: speedLo, max: speedHi },
      accel:  { x: 0, y: 0 },
      gravity: T.foam.motion.gravity,
      jitter: { pos: T.foam.motion.jitterPos, velAngle: T.foam.motion.jitterAngle },
      drag:   Math.max(0, T.foam.motion.drag || 0),
      count:  T.foam.pool.count,
      size:   { min: sizeLo, max: sizeHi },
      sizeHz: T.foam.pool.sizeHz,
      lifetime:   { min: lifeLo, max: lifeHi },
      fadeInFrac: T.foam.pool.fadeInFrac,
      fadeOutFrac:T.foam.pool.fadeOutFrac,
      edgeFadePx: T.foam.edgeFadePx,
      color: colorFn,
      respawn: true,
    }, dtSec);
  }

  p.pop(); // end WATER scope

  // ---- Cap rectangle (no size oscillation; scale <- clamped liveAvg) ----
  if (T.capRect.enable) {
    if (wantClip) ctx.restore();
    const surfaceY = bottomY + Ttop0 * waterScaleY;

    const rectW  = T.capRect.widthTiles  * (cellW ?? 0);
    const rectH  = T.capRect.heightTiles * (cellH ?? 0);
    const radius = Math.min(T.capRect.cornerPx, rectH / 2);
    const followOffset = T.capRect.followOffsetPx;

    const sm = T.capRect.scaleMap;
    const uClamped = Math.max(0, Math.min(1, (u - sm.uMin) / Math.max(1e-6, (sm.uMax - sm.uMin))));
    const sx = mix(sm.xMin, sm.xMax, uClamped);
    const sy = mix(sm.yMin, sm.yMax, uClamped);

    ctx.save();
    ctx.translate(cx, surfaceY + followOffset);
    ctx.scale(sx, sy);

    const left = -rectW / 2;
    const top  = -rectH;

    const rectAlpha = aFactor * T.capRect.alphaMul;

    const baseTop = T.capRect.color.top;
    const baseBot = T.capRect.color.bottom;
    const satOsc = T.capRect.satOsc;
    const topCol = oscillateSaturation(baseTop, tSec, { amp: satOsc.amp, speed: satOsc.speed, phase: satOsc.phase });
    const botCol = oscillateSaturation(baseBot, tSec, { amp: satOsc.amp, speed: satOsc.speed, phase: satOsc.phase + Math.PI / 4 });

    const grad = ctx.createLinearGradient(0, top, 0, 0);
    grad.addColorStop(0, cssRgba(topCol.r, topCol.g, topCol.b, rectAlpha));
    grad.addColorStop(1, cssRgba(botCol.r, botCol.g, botCol.b, rectAlpha));
    ctx.fillStyle = grad;

    ctx.beginPath();
    roundedRect(ctx, left, top, rectW, rectH, radius);
    ctx.fill();
    ctx.restore();

    // re-clip after cap
    if (wantClip) { ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip(); }
  }

  // SPILL (particle-2) — gated by liveAvg; spills outside tile
  if (T.spill.enable) {
    // Remove clip before spill so particles can render into the bleed area (sea has 0.45-tile
    // horizontal bleed on each side — enough for the falling corridors to sit outside the pool).
    if (wantClip) ctx.restore();

    const gGate = T.spill.liveGate;
    const spillK = liveWindowK(u, gGate.min, gGate.max, gGate.soft);

    if (spillK > 0.01) {
      const dtSec =
        (typeof opts.deltaSec === 'number' && opts.deltaSec > 0)
          ? opts.deltaSec
          : (p.deltaTime ? Math.max(1/120, p.deltaTime / 1000) : 1/60);

      // sprite-mode adjustments: keep inside tile + remove global shift/nudges
      const spillRaw = Math.max(0, T.spill.spillPx);
      const spill = isSprite ? Math.min(spillRaw, Math.round(cell * 0.10)) : spillRaw;

      const isMobile = cell <= T.spill.mobile.cellMax;

      const globalShiftX = isSprite ? 0 : (T.spill.offsetTilesX * (cellW ?? 0));

      const waterTopY    = bottomY + Ttop0 * waterScaleY;
      const waterBottomY = bottomY + (Ttop0 + H0) * waterScaleY;
      const bottomBound  = y0 + h;

      const surfaceY = waterTopY;
      const bandTopY = surfaceY - cell * 0.10;
      const bandH    = Math.max(1, bottomBound - bandTopY + cell * 0.25);

      const spawnHeightPx = Math.max(8, cell * 0.35);
      const spawnFracY = Math.min(1, spawnHeightPx / Math.max(1, bandH));

      const leftSpawnFracX  = T.spill.leftSpawnFracX;
      const rightSpawnFracX = T.spill.rightSpawnFracX;

      const colWBase = Math.max(8, cell * 0.35);

      // Base X for each corridor.
      // In sprite mode: anchor corridors to the bowl walls (x0 / x0+w) so particles fall
      // in the bleed area outside the pool, not inside it. Canvas mode uses global shift/nudges.
      const leftNudge  = isSprite ? 0 : (T.spill.leftNudgePx  + (isMobile ? T.spill.mobile.leftNudgePx  : 0));
      const rightNudge = isSprite ? 0 : (T.spill.rightNudgePx + (isMobile ? T.spill.mobile.rightNudgePx : 0));

      const extraRoom = isMobile ? Math.round(cell * 0.25) : T.spill.leftExtraRoomPx;
      const leftCorridorW  = colWBase + extraRoom;
      const rightCorridorW = colWBase + (isSprite ? extraRoom : spill);

      const leftBaseX  = isSprite
        ? (x0 - leftCorridorW)
        : (x0 - spill + globalShiftX + leftNudge);
      const rightBaseX = isSprite
        ? (x0 + w)
        : (x0 + w - colWBase + globalShiftX + rightNudge);

      const leftCorridor  = { x: leftBaseX,  y: bandTopY, w: leftCorridorW,  h: bandH };
      const rightCorridor = { x: rightBaseX, y: bandTopY, w: rightCorridorW, h: bandH };

      // Spawn fracs: in sprite mode target the full corridor (which is now entirely in bleed),
      // avoiding the extreme outer edge. Canvas mode uses the tuning values as-is.
      const leftSpawnFrac = isSprite
        ? { x0: 0.10, x1: 0.90, y0: 0.00, y1: spawnFracY }
        : { x0: leftSpawnFracX[0],  x1: leftSpawnFracX[1],  y0: 0.00, y1: spawnFracY };
      const rightSpawnFrac = isSprite
        ? { x0: 0.10, x1: 0.90, y0: 0.00, y1: spawnFracY }
        : { x0: rightSpawnFracX[0], x1: rightSpawnFracX[1], y0: 0.00, y1: spawnFracY };

      const rMin  = (Array.isArray(T.spill.sizePx) ? T.spill.sizePx[0] : T.spill.sizePx) * pxK;
      const rMax  = Math.max(rMin, (Array.isArray(T.spill.sizePx) ? T.spill.sizePx[1] : rMin) * pxK);
      const gatedCount = Math.max(0, Math.floor(T.spill.count * spillK));
      const alphaMul = spillK;

      const lifeMin = T.spill.lifetimeSec[0];
      const lifeMax = T.spill.lifetimeSec[1];
      const leftLifeMin = T.spill.leftLifetimeSec[0];
      const leftLifeMax = T.spill.leftLifetimeSec[1];

      const keySuffix = isSprite ? ':spr' : '';

      const runSide = (side: 'L' | 'R'): void => {
        const isLeft  = side === 'L';
        const rectSim = isLeft ? leftCorridor  : rightCorridor;
        const spawnFr = isLeft ? leftSpawnFrac : rightSpawnFrac;
        const dir     = isLeft ? 'left' : 'right';
        const spRange = isLeft ? T.spill.leftSpeedPxSec : T.spill.rightSpeedPxSec;
        const accelX  = T.spill.coneAccelX * (isLeft ? -1 : 1);

        if (gatedCount < 1) return;

        stepAndDrawPuffs(p, {
          key: `spill:${String(f.r0)}:${String(f.c0)}:${String(spanTilesX)}x${String(f.h)}:${side}${keySuffix}`,
          rect: rectSim,
          dir,
          spreadAngle: T.spill.spreadAngle,

          spawnMode: 'stratified',
          respawnStratified: true,
          spawn: spawnFr,

          speed:  { min: spRange[0], max: spRange[1] },
          accel:  { x: accelX, y: 0 },
          gravity: T.spill.gravity,
          jitter: { pos: 2, velAngle: 0.25 },
          drag:   T.spill.drag,

          count:  gatedCount,
          size:   { min: rMin, max: rMax },
          sizeHz: 5,
          lifetime: isLeft
            ? { min: leftLifeMin, max: leftLifeMax }
            : { min: lifeMin,     max: lifeMax     },

          fadeInFrac: T.spill.fadeInFrac,
          fadeOutFrac:T.spill.fadeOutFrac,

          edgeFadePx: isLeft
            ? { left: T.spill.leftEdgeFadeLeftPx, right: 8, top: 8, bottom: 8 }
            : T.spill.edgeFadePx,

          color: (pr) => {
            if (pr.y > bottomBound) return { r: 0, g: 0, b: 0, a: 0 };
            const c = seaRGBAtY(pr.y, waterTopY, waterBottomY, topRGB, bottomRGB);
            return { r: c.r, g: c.g, b: c.b, a: Math.round(175 * aFactor * alphaMul) };
          },

          respawn: true,
        }, dtSec);
      };

      runSide('L');
      runSide('R');
    }

    // re-clip after spill so the bowl and subsequent elements stay within bounds
    if (wantClip) { ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip(); }
  }

  // 2) BOWL composite (proportional; mobile-safe)
  if (T.bowl.enable) {
    const isMobile = cell <= T.bowl.mobile.cellMax;

    const kThickness = isMobile ? T.bowl.mobile.thicknessK : T.bowl.thicknessK;
    const fBase      = isMobile ? T.bowl.mobile.baseFrac    : T.bowl.baseFrac;
    const fPostTop   = isMobile ? T.bowl.mobile.postTopFrac : T.bowl.postTopFrac;
    const kColWidth  = isMobile ? T.bowl.mobile.colWidthK   : T.bowl.colWidthK;
    const kCorner    = isMobile ? T.bowl.mobile.cornerK     : T.bowl.cornerK;

    const tEff   = Math.max(1, Math.round(cell * kThickness));
    const baseH  = Math.max(tEff, Math.round(H0 * fBase));
    const baseY  = (bottomY + Ttop0) + H0 - baseH;
    const baseX  = cx + L0;
    const baseW  = W0;

    const postsTopY   = (bottomY + Ttop0) + Math.round(H0 * fPostTop);
    const colW        = Math.max(1, Math.round(tEff * kColWidth));
    const postR       = Math.max(0, (T.bowl.pieceRadiusPx ?? 0) | 0);
    const baseOverlap = Math.max(0, T.bowl.baseOverlapPx ?? 2);
    const postBottomY = baseY + baseOverlap;
    const postDrawH   = Math.max(1, postBottomY - postsTopY - Math.max(0, T.bowl.postBottomLiftPx ?? Math.ceil(postR)));

    const leftX  = cx + L0;
    const rightX = cx + L0 + W0 - colW;

    const gb = T.bowl.grassBlend;
    const blendK = clamp01(val(gb.colorBlend, u));
    const [satLo, satHi] = gb.satRange;
    const [briLo, briHi] = gb.brightRange;

    let bowlRGB = grassPal;
    if (opts.gradientRGB) bowlRGB = blendRGB(bowlRGB, opts.gradientRGB, blendK);
    bowlRGB = clampSaturation(bowlRGB, satLo, satHi, 1);
    bowlRGB = clampBrightness(bowlRGB, briLo, briHi, 1);

    const aBowl = Math.round(255 * clamp01(T.bowl.alphaMul) * aFactor);
    ctx.fillStyle = cssRgba(bowlRGB.r, bowlRGB.g, bowlRGB.b, aBowl / 255);

    const rCorner = Math.round(cell * kCorner);
    {
      const r = Math.min(rCorner, baseH / 2, baseW / 2);
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(baseX + baseW, baseY);
      ctx.lineTo(baseX + baseW, baseY + baseH - r);
      ctx.quadraticCurveTo(baseX + baseW, baseY + baseH, baseX + baseW - r, baseY + baseH);
      ctx.lineTo(baseX + r, baseY + baseH);
      ctx.quadraticCurveTo(baseX, baseY + baseH, baseX, baseY + baseH - r);
      ctx.lineTo(baseX, baseY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.beginPath();
    roundedRect(ctx, leftX,  postsTopY, colW, postDrawH, postR);
    roundedRect(ctx, rightX, postsTopY, colW, postDrawH, postR);
    ctx.fill();
  }

  // top border (optional)
  if (T.topBorder.enable && (T.topBorder.topLinePx > 0)) {
    const aLine = Math.round(drawAlpha * clamp01(T.topBorder.topLineAlpha));
    const kMix = clamp01(T.topBorder.topLineMix);
    const lineRGB = {
      r: Math.round(topRGB.r + (bottomRGB.r - topRGB.r) * kMix),
      g: Math.round(topRGB.g + (bottomRGB.g - topRGB.g) * kMix),
      b: Math.round(topRGB.b + (bottomRGB.b - topRGB.b) * kMix),
    };
    p.push();
    p.noFill();
    p.stroke(lineRGB.r, lineRGB.g, lineRGB.b, aLine);
    p.strokeWeight(T.topBorder.topLinePx);
    p.line(cx + L0, bottomY + Ttop0, cx + L0 + W0, bottomY + Ttop0);
    p.pop();
  }

  if (wantClip) ctx.restore();
  p.pop(); // end GROUP transform
}
