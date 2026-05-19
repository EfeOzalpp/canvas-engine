// src/canvas-engine/shapes/sun.ts
import {
  clamp01,
  val,
  blendRGB,
  oscillateSaturation,
  applyShapeMods,
  footprintToPx,
} from "../modifiers/index";
import type { RGB } from "../modifiers/index";
import type { ShapeCanvas, ShapeDrawOptions, ShapePalette } from "./types";
import { applyExposureContrast } from "./shared/color";
import { finiteNumber } from "./shared/numbers";

type NumberRange = [number, number];
type SunPaletteTheme = "warm" | "cool";

interface SunPalette extends ShapePalette {
  default: RGB;
  ray: RGB;
}

interface MoonPalette {
  default: RGB;
}

interface SunOptions extends ShapeDrawOptions<SunPalette> {
  paletteTheme?: SunPaletteTheme;
  sunBlend?: number;
  sunGradientRGB?: RGB | null;
  sunCss?: string;
  oscAmp?: number;
  oscSpeed?: number;
  oscPhase?: number;
  rayGapPx?: number;
  rayLen?: number;
  rayLenMult?: number;
  rayThickness?: number;
  rayThicknessMult?: number;
  rayCount?: number;
}

function rgba({ r, g, b }: RGB, alpha01: number): string {
  return `rgba(${String(r)},${String(g)},${String(b)},${String(alpha01)})`;
}

// light mode
const SUN_BASE_PALETTE: SunPalette = {
  default: { r: 255, g: 196, b: 60 },
  ray:     { r: 255, g: 140, b: 40 },
};

// dark mode
const SUN_DARK_PALETTE: SunPalette = {
  default: { r: 140, g: 124, b: 46 },
  ray:     { r: 140, g: 88,  b: 31 },
};

const SUN_WARM_PALETTE: SunPalette = {
  default: { r: 255, g: 188, b: 44  },
  ray:     { r: 248, g: 118, b: 26  },
};

const SUN_COOL_PALETTE: SunPalette = {
  default: { r: 255, g: 222, b: 128 },
  ray:     { r: 248, g: 180, b: 80  },
};

const MOON_DARK_PALETTE: MoonPalette = {
  default: { r: 195, g: 208, b: 228 }, // cool silver-blue
};

const SUN = {
  colorBlend: [0.30, 0.00],
  oscAmp:     [0.12, 0.06],
  oscSpeed:   [0.4, 0.02],

  // geometry (interpreted against caller's r)
  rayCount:        [6, 10],
  rayLenK:         [0.80, 0.52],
  rayThickK:       [0.06, 0.04],

  // “base” core diameter and the older anchor (kept so visuals stay familiar)
  coreDiamK:       [0.6, 0.45],
  rayAnchorDiamK:  [0.46, 0.28],
} satisfies Record<string, NumberRange>;

/**
 * drawSun(p, x, y, r, opts)
 *
 * Important opts:
 * - alpha (0..255)
 * - exposure, contrast
 * - liveAvg (0..1)
 * - gradientRGB / sunGradientRGB / sunCss
 * - timeMs
 * - rootAppearK
 * - fitToFootprint + {cell, footprint}
 *
 * Fixed-gap ray control:
 * - rayGapPx         (number, pixels) — default ties to stroke
 * - rayLen           (number, pixels) — overrides computed length
 * - rayLenMult       (number)         — scales computed length
 * - rayThickness     (number, px)     — overrides stroke weight
 * - rayThicknessMult (number)         — scales computed stroke
 * - rayCount         (integer)
 * - coreScaleMult    (number)         — multiplies core base diameter (before osc)
 */
function drawCrescentMoon(
  p: ShapeCanvas,
  x: number,
  y: number,
  r: number,
  opts: SunOptions,
  t: number,
  ex: number,
  ct: number
): void {
  const u = clamp01(opts.liveAvg ?? 0.5);

  let moonTint = MOON_DARK_PALETTE.default;
  if (opts.gradientRGB) moonTint = blendRGB(moonTint, opts.gradientRGB, 0.08);
  moonTint = applyExposureContrast(moonTint, ex, ct);
  const pulsed = oscillateSaturation(moonTint, t, {
    amp:   val([0.12, 0.04], u),
    speed: val([0.40, 0.06], u),
    phase: 0,
  });

  const coreBase = r * val(SUN.coreDiamK, u) * (opts.coreScaleMult ?? 5);
  const desiredAbsOsc = r * val([0.05, 0.01], u);

  const m = applyShapeMods({
    p, x, y, r: coreBase,
    opts: {
      alpha: finiteNumber(opts.alpha, 235),
      timeMs: opts.timeMs,
      liveAvg: opts.liveAvg,
      rootAppearK: opts.rootAppearK,
    },
    mods: {
      appear: { scaleFrom: 0.0, alphaFrom: 0.0, anchor: 'center', ease: 'back', backOvershoot: 1.6 },
      sizeOsc: {
        mode:    'absolute',
        biasAbs: coreBase,
        ampAbs:  desiredAbsOsc,
        speed:   val([8.0, 0.18], u),
        anchor:  'center',
      },
      opacityOsc: { amp: val([12, 5], u), speed: val([0.38, 0.10], u) },
      rotation: { speed: 0 },
    },
  });

  // Crescent drawn as two-arc path:
  // outer arc  = moon circle (the lit limb)
  // inner arc  = shadow circle of equal radius, offset along +X
  // d = 0.7R  →  "almost half moon, slightly crescent" appearance
  const R = m.r / 2;           // m.r is p5 circle diameter, convert to radius
  const d = R * 0.7;           // shadow circle offset (0=full dark, 2R=full moon)
  const ix = d / 2;            // x-coord of intersection points
  const iy = Math.sqrt(Math.max(0, R * R - ix * ix)); // y-coord

  // Angles from moon center (0,0) and shadow center (d,0) to the intersection points
  const moonTop = Math.atan2(-iy, ix);
  const moonBot = Math.atan2( iy, ix);
  const shadBot = Math.atan2( iy, ix - d);
  const shadTop = Math.atan2(-iy, ix - d);

  const alpha = typeof m.alpha === 'number' ? m.alpha : 235;
  const ctx = p.drawingContext;

  p.push();
  p.translate(m.x, m.y);
  p.scale(m.scaleX, m.scaleY);

  ctx.save();
  ctx.rotate(-Math.PI / 5); // ~36° tilt — classic "resting moon" angle

  ctx.beginPath();
  ctx.arc(0, 0, R, moonTop, moonBot, true);   // outer limb: sweep left (lit) side
  ctx.arc(d, 0, R, shadBot, shadTop, false);  // inner limb: shadow boundary
  ctx.closePath();
  ctx.fillStyle = rgba(pulsed, alpha / 255);
  ctx.fill();

  ctx.restore();
  p.pop();
}

export function drawSun(
  p: ShapeCanvas,
  xIn: number,
  yIn: number,
  rIn: number,
  opts: SunOptions = {}
): void {
  const pal = opts.palette ?? (opts.darkMode ? SUN_DARK_PALETTE
    : opts.paletteTheme === 'warm' ? SUN_WARM_PALETTE
    : opts.paletteTheme === 'cool' ? SUN_COOL_PALETTE
    : SUN_BASE_PALETTE);
  const u = clamp01(opts.liveAvg ?? 0.5);
  const t = ((typeof opts.timeMs === 'number' ? opts.timeMs : p.millis()) / 1000);

  const ex = finiteNumber(opts.exposure, 1);
  const ct = finiteNumber(opts.contrast, 1);

  // allow footprint fit (convenience for grid users)
  let x = xIn, y = yIn, r = rIn;
  if (opts.fitToFootprint && opts.cell && opts.footprint) {
    const { c0, w } = opts.footprint;
    const cellW = opts.cellW ?? opts.cell;
    const { y: fpY, h: fpH } = footprintToPx(opts.footprint, opts);
    const cx = c0 * cellW + (w * cellW) / 2;
    const cy = fpY + fpH / 2;
    const diam = Math.min(w * cellW, fpH);
    x = cx; y = cy; r = diam;
  }

  // Dark mode → crescent moon instead of sun
  if (opts.darkMode) {
    drawCrescentMoon(p, x, y, r, opts, t, ex, ct);
    return;
  }

  // color blending setup
  const sunBlendDefault = val(SUN.colorBlend, u);
  const sunBlend = (typeof opts.sunBlend === 'number') ? clamp01(opts.sunBlend) : sunBlendDefault;
  const oscAmp   = (typeof opts.oscAmp   === 'number') ? opts.oscAmp   : val(SUN.oscAmp,   u);
  const oscSpeed = (typeof opts.oscSpeed === 'number') ? opts.oscSpeed : val(SUN.oscSpeed, u);
  const oscPhase = opts.oscPhase ?? 0;

  // core tint
  let baseTint = pal.default;
  if (typeof opts.sunCss === 'string' && opts.sunCss.trim().length > 0) {
    const c = p.color(opts.sunCss);
    baseTint = { r: p.red(c), g: p.green(c), b: p.blue(c) };
  } else if (opts.sunGradientRGB) {
    baseTint = blendRGB(pal.default, opts.sunGradientRGB, sunBlend);
  } else if (opts.gradientRGB) {
    baseTint = blendRGB(pal.default, opts.gradientRGB, sunBlend);
  }
  let pulsedCore = oscillateSaturation(baseTint, t, { amp: oscAmp, speed: oscSpeed, phase: oscPhase });
  pulsedCore = applyExposureContrast(pulsedCore, ex, ct);

  // ray tint
  let rayTintBase = opts.gradientRGB ? blendRGB(pal.ray, opts.gradientRGB, sunBlend) : pal.ray;
  rayTintBase = applyExposureContrast(rayTintBase, ex, ct);
  const pulsedRay = oscillateSaturation(rayTintBase, t, { amp: oscAmp, speed: oscSpeed, phase: oscPhase });

  // geometry knobs
  const rayCount = Math.max(6, Math.floor(opts.rayCount ?? val(SUN.rayCount, u)));

  // base sizes (core + anchor), with explicit override multiplier for the core
  const coreBase = r * val(SUN.coreDiamK, u) * (opts.coreScaleMult ?? 5);
  // default derived sizes for rays
  const rayLenBaseRaw = r * val(SUN.rayLenK, u);
  const rayLenBase = Math.max(0,
    (typeof opts.rayLen === 'number' ? opts.rayLen : rayLenBaseRaw) * (opts.rayLenMult ?? 1)
  );

  const rayThickBaseRaw = Math.round(r * val(SUN.rayThickK, u));
  const rayThickness = Math.max(1,
    (typeof opts.rayThickness === 'number'
      ? opts.rayThickness
      : rayThickBaseRaw * (opts.rayThicknessMult ?? 1))
  );

  // appear + core breathing (only the core's diameter uses sizeOsc; rays use stable gap to core edge)
  const desiredAbsOsc = r * val([0.10, 0.02], u);
  const m = applyShapeMods({
    p, x, y, r: coreBase,
    opts: {
      alpha: finiteNumber(opts.alpha, 235),
      timeMs: opts.timeMs,
      liveAvg: opts.liveAvg,
      rootAppearK: opts.rootAppearK,
    },
    mods: {
      appear: {
        scaleFrom: 0.0,
        alphaFrom: 0.0,
        anchor: 'center',
        ease: 'back',
        backOvershoot: 1.6,
      },
      sizeOsc: {
        mode:   'absolute',
        biasAbs: coreBase,      // base core diameter
        ampAbs:  desiredAbsOsc, // breathing amplitude (in pixels)
        speed:   val([10.5, 0.18], u),
        anchor: 'center',
      },
      opacityOsc: { amp: val([20, 40], u), speed: val([0.12, 0.25], u) },
      rotation:   { speed: val([0.4, 0.1], u) },
    }
  });

  // drawing context
  const ctx = p.drawingContext;
  p.push();
  p.translate(m.x, m.y);
  p.scale(m.scaleX, m.scaleY); // appear envelope scales both core + rays uniformly

  // rays: start at (live core radius) + fixed pixel gap (no breathing of the gap)
  const coreRadiusNow = m.r * 0.5;
  const rayGapPx = typeof opts.rayGapPx === "number" && Number.isFinite(opts.rayGapPx)
    ? opts.rayGapPx
    : Math.max(8, Math.round(rayThickness * 1.6)); // default gap ties gently to stroke

  const a = (typeof m.alpha === 'number' ? m.alpha : 235) / 255;
  p.noFill();
  p.strokeWeight(rayThickness);

  for (let i = 0; i < rayCount; i++) {
    const theta = (i / rayCount) * Math.PI * 2 + m.rotation;
    const len = (i % 2 === 0) ? rayLenBase * 0.7 : rayLenBase * 1.2;

    const startR = coreRadiusNow + rayGapPx;
    const endR   = startR + len;

    const x1 = Math.cos(theta) * startR;
    const y1 = Math.sin(theta) * startR;
    const x2 = Math.cos(theta) * endR;
    const y2 = Math.sin(theta) * endR;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, rgba(pulsedCore, a));
    grad.addColorStop(1, rgba(pulsedRay, a));

    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // core (uses m.r which already includes breathing)
  p.noStroke();
  p.fill(pulsedCore.r, pulsedCore.g, pulsedCore.b, (typeof m.alpha === 'number' ? m.alpha : 235));
  p.circle(0, 0, m.r);

  p.pop();
}
