// src/canvas-engine/shapes/villa.js
import {
  clamp01,
  val,
  blendRGB,
  clampBrightness,
  clampSaturation,
  oscillateBrightness,
  applyShapeMods,
  footprintToPx,
  sampleDirectionalLightRect,
  lightClosenessBand,
  pickLightBandValue,
  paintPixelLightBands,
  paintDirectionalTriangleBands,
  mixRgb,
} from "../modifiers/index";
import type { DirectionalLightSample, LightClosenessBandMap, RGB } from "../modifiers/index";
import type { ShapeCanvas, ShapeDrawOptions, ShapePalette, ShapeSeed } from "./types";
import { applyExposureContrast, fillRgb, strokeRgb } from "./shared/color";
import { shapeHash32, seeded01 as sharedSeeded01, seededUnit, pick } from "./shared/random";

type NumberRange = [number, number];
type VillaProfileName = "short" | "mid" | "tall";

interface VillaPalette extends ShapePalette {
  grass: RGB;
  grassByLight?: LightClosenessBandMap<RGB>;
  treeFoliage: RGB[];
  treeFoliageByLight?: LightClosenessBandMap<RGB[]>;
  body: RGB[];
  roof: RGB[];
  door: RGB[];
  window: { lit: RGB; dark: RGB };
  platform: RGB;
}

interface WindowProfile {
  W_FRAC: number;
  H_FRAC: number;
  TOP_FRAC?: number;
  BOT_MARGIN?: number;
  Y_OFF_FRAC?: number;
}

interface VillaTuning {
  body: { colorBlend: NumberRange; brightnessRange: NumberRange };
  grass: { colorBlend: NumberRange; satRange: NumberRange };
  tree: { colorBlend: NumberRange };
  door: { widthRange: NumberRange; fixedHeights: NumberRange; sideMarginPxK: number };
  roof: { triFracFront: NumberRange; triFracSide: NumberRange; dropSideK: number; extendK: number };
  sideVolume: { heightK: number };
  bodyShape: { frontHMinK: number; frontHMaxK: number; sideHMinK: number; sideHMaxK: number };
  variants: { sideRoofChance: number };
  windows: { marginY: number; frontVert: NumberRange; sideSmall: NumberRange; sideYOffsetK: number };
  platform: { baseK: number; scaleRange: NumberRange };
  foliage: {
    scaleRange: NumberRange;
    baseWk: number;
    baseHk: number;
    triHk: number;
    offsetEdgePx: number;
    jitterPx: number;
    wind: {
      rotAmp: number;
      rotAmpTopMul: number;
      xShearAmp: number;
      speedRange: NumberRange;
      phaseJitter: number;
    };
  };
}

// ───────────────── Palette
const VILLA_BASE_PALETTE: VillaPalette = {
  grass: { r: 130, g: 172, b: 116 },
  treeFoliage: [
    { r: 108, g: 176, b: 110 },
    { r: 92,  g: 161, b: 100 },
    { r: 122, g: 192, b: 122 },
    { r: 100, g: 148, b: 96  },
    { r: 136, g: 202, b: 118 },
    { r: 152, g: 214, b: 132 },
    { r: 164, g: 224, b: 140 },
    { r: 178, g: 234, b: 146 },
  ],

  body: [
    { r: 244, g: 228, b: 206 },
    { r: 216, g: 236, b: 244 },
    { r: 220, g: 236, b: 220 },
    { r: 232, g: 224, b: 226 },
    { r: 214, g: 232, b: 248 },
    { r: 208, g: 226, b: 208 },
    { r: 248, g: 236, b: 194 },
    { r: 236, g: 216, b: 206 },
    { r: 208, g: 216, b: 238 },
  ],

  roof: [
    { r: 190, g: 95,  b: 80 },
    { r: 150, g: 105, b: 92 },
    { r: 130, g: 110, b: 100 },
  ],

  door: [
    { r: 170, g: 120, b: 70 },
    { r: 160, g: 150, b: 95 },
    { r: 180, g: 140, b: 100 },
  ],

  window: {
    lit:  { r: 255, g: 234, b: 148 },
    dark: { r: 120, g: 170, b: 220 },
  },

  platform: { r: 130, g: 134, b: 138 },
};

const VILLA_DARK_PALETTE: VillaPalette = {
  grass: { r: 58, g: 108, b: 114 },
  grassByLight: {
    far:  { r: 82, g: 94,  b: 88 },
    mid:  { r: 68, g: 102, b: 100 },
    near: { r: 58, g: 108, b: 114 },
  },
  treeFoliage: [
    { r: 64, g: 102, b: 98  },
    { r: 58, g: 94,  b: 90  },
    { r: 72, g: 110, b: 100 },
    { r: 61, g: 88,  b: 84  },
    { r: 76, g: 116, b: 104 },
    { r: 82, g: 124, b: 110 },
    { r: 88, g: 132, b: 116 },
    { r: 94, g: 140, b: 122 },
    { r: 66, g: 108, b: 126 },
    { r: 74, g: 98,  b: 126 },
    { r: 88, g: 112, b: 94  },
    { r: 102, g: 120, b: 98  },
    { r: 78, g: 90,  b: 116 },
    { r: 60, g: 110, b: 110 },
    { r: 86, g: 100, b: 90  },
    { r: 98, g: 128, b: 108 },
  ],
  treeFoliageByLight: {
    far: [
      { r: 128, g: 124, b: 100 },
      { r: 132, g: 118, b: 104 },
      { r: 118, g: 118, b: 106 },
      { r: 116, g: 118, b: 108 },
    ],
    mid: [
      { r: 64, g: 140, b: 96  },
      { r: 72, g: 138, b: 98  },
      { r: 76, g: 134, b: 102 },
      { r: 88, g: 140, b: 92  },
      { r: 100, g: 138, b: 96  },
      { r: 96, g: 136, b: 106 },
    ],
    near: [
      { r: 56, g: 116, b: 134 },
      { r: 64, g: 116, b: 134 },
      { r: 50, g: 120, b: 120 },
      { r: 82, g: 122, b: 118 },
      { r: 78, g: 120, b: 114 },
      { r: 84, g: 118, b: 120 },
    ],
  },
  body: [
    { r: 126, g: 146, b: 180 }, { r: 118, g: 150, b: 192 }, { r: 122, g: 154, b: 186 },
    { r: 130, g: 142, b: 188 }, { r: 120, g: 150, b: 196 }, { r: 114, g: 148, b: 172 },
    { r: 154, g: 124, b: 158 }, // orange-lean, purple undertone (mauve)
    { r: 110, g: 146, b: 166 }, // green-lean, purple undertone (slate-teal)
    { r: 136, g: 128, b: 176 },
    { r: 106, g: 138, b: 178 },
    { r: 142, g: 120, b: 166 },
    { r: 112, g: 150, b: 154 },
  ],
  roof: [
    { r: 104, g: 60, b: 61 },
    { r: 82,  g: 66, b: 70 },
    { r: 71,  g: 69, b: 77 },
  ],
  door: [
    { r: 93, g: 76, b: 54 },
    { r: 88, g: 95, b: 73 },
    { r: 99, g: 88, b: 77 },
  ],
  window: {
    lit:  { r: 255, g: 186, b: 62 },
    dark: { r: 116, g: 128, b: 188 },
  },
  platform: { r: 82, g: 86, b: 88 },
};

// ───────────────── Tunables
const VILLA: VillaTuning = {
  body: {
    colorBlend: [0.04, 0.02],
    brightnessRange: [0.40, 0.70],
  },
  grass: {
    colorBlend: [0.12, 0.18],
    satRange: [0.00, 0.14],
  },
  tree: {
    colorBlend: [0.24, 0.38],
  },
  door: {
    widthRange: [1.2, 0.9],
    fixedHeights: [12, 14],
    sideMarginPxK: 0.12,
  },
  roof: {
    triFracFront: [0.20, 0.24],
    triFracSide:  [0.24, 0.36],
    dropSideK: 0.30,
    extendK: 0.44,
  },
  sideVolume: {
    heightK: 0.84,
  },
  bodyShape: {
    frontHMinK: 1.00, frontHMaxK: 1.20,
    sideHMinK:  0.46, sideHMaxK:  0.68,
  },
  variants: {
    sideRoofChance: 0.78,
  },
  windows: {
    marginY: 6,
    frontVert: [10, 16],
    sideSmall: [8, 10],
    sideYOffsetK: 0.38,
  },
  platform: {
    baseK: 0.25,
    scaleRange: [0.0, 1.0]
  },
  foliage: {
    scaleRange: [0.70, 1.15],
    baseWk: 0.20,
    baseHk: 0.36,
    triHk:  0.65,
    offsetEdgePx: 6,
    jitterPx: 4,
    wind: {
      rotAmp: 0.03,
      rotAmpTopMul: 1.35,
      xShearAmp: 0.06,
      speedRange: [0.6, 0.2],
      phaseJitter: Math.PI * 4,
    },
  }
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
  amp: [0.035, 0.08],
  speed: [0.18, 0.4],
  colorAmp: [0.05, 0.12],
  colorSpeed: [0.045, 0.09],
  brightnessMin: [0.56, 0.74],
  brightnessMax: [0.84, 0.97],
  litCurve: 0.95,
};

const WINDOW_COLOR_TARGETS: RGB[] = [
  { r: 255, g: 214, b: 122 },
  { r: 255, g: 232, b: 176 },
  { r: 255, g: 198, b: 104 },
  { r: 236, g: 242, b: 255 },
];

// helpers
function darken(rgb: RGB, k = 0.72): RGB {
  return { r: Math.round(rgb.r * k), g: Math.round(rgb.g * k), b: Math.round(rgb.b * k) };
}
function iround(x: number): number { return Math.round(x); }
function clampMinMax(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hash32(s: string): number { return shapeHash32(s); }
function rand01(seed: number): number { return seededUnit(seed); }
function seeded01(key: ShapeSeed, salt = ""): number { return sharedSeeded01(key, salt); }

function oscillateWindowColor(base: RGB, timeSec: number, oscSeed: number): RGB {
  const targetR = rand01(oscSeed ^ 0x165667b1);
  const target = WINDOW_COLOR_TARGETS[Math.floor(targetR * WINDOW_COLOR_TARGETS.length) % WINDOW_COLOR_TARGETS.length];
  const amp = val(WINDOW_OSC.colorAmp, rand01(oscSeed ^ 0xd3a2646c));
  const speed = val(WINDOW_OSC.colorSpeed, rand01(oscSeed ^ 0xfd7046c5));
  const phase = rand01(oscSeed ^ 0xb55a4f09) * Math.PI * 2;
  const k = (0.5 + 0.5 * Math.sin(timeSec * Math.PI * 2 * speed + phase)) * amp;
  return mixRgb(base, target, k);
}

// Trees tint
interface VillaTreeTintOptions {
  darkMode?: boolean;
  lightSample?: DirectionalLightSample | null;
  palette?: VillaPalette | null;
  seedKey?: ShapeSeed;
  blend?: number;
}

function treeTintFromGrass(
  grass: RGB,
  u: number,
  gradientRGB: RGB | undefined,
  ex = 1,
  ct = 1,
  opts: VillaTreeTintOptions = {}
): RGB {
  const { darkMode = false, lightSample = null, palette = null, seedKey = 'villa-tree', blend = 1 } = opts;
  const band = lightSample ? lightClosenessBand(lightSample.closenessK) : 'mid';
  const foliageSet: RGB[] | undefined = darkMode
    ? (palette?.treeFoliageByLight?.[band] ?? palette?.treeFoliage)
    : palette?.treeFoliage;
  if (foliageSet?.length) {
    const base = pick(foliageSet, seeded01(seedKey, `foliage|${band}`));
    let mixed = blendRGB(base, grass, darkMode ? 0.08 + 0.08 * u : 0.08 + 0.08 * u);
    const gradientBlend = clamp01(val(VILLA.tree.colorBlend, u) * blend);
    if (gradientRGB && gradientBlend > 0) mixed = blendRGB(mixed, gradientRGB, gradientBlend);
    mixed = clampSaturation(mixed, 0.0, darkMode ? 0.28 : 0.32, 1);
    mixed = clampBrightness(mixed, darkMode ? 0.44 : 0.60, darkMode ? 0.55 : 0.88);
    return applyExposureContrast(mixed, ex, ct);
  }

  const lightK = 0.26 + 0.18 * u;
  const base = {
    r: Math.min(255, Math.round(grass.r + (255 - grass.r) * lightK)),
    g: Math.min(255, Math.round(grass.g + (255 - grass.g) * lightK)),
    b: Math.min(255, Math.round(grass.b + (255 - grass.b) * lightK)),
  };
  const cool = { r: 210, g: 230, b: 255 };
  const k = 0.08 + 0.10 * u;
  const mixed = {
    r: Math.round(base.r + (cool.r - base.r) * k),
    g: Math.round(base.g + (cool.g - base.g) * k),
    b: Math.round(base.b + (cool.b - base.b) * k),
  };
  const gradientBlend = clamp01(val(VILLA.tree.colorBlend, u) * blend);
  const blended = gradientRGB && gradientBlend > 0 ? blendRGB(mixed, gradientRGB, gradientBlend) : mixed;
  const clamped = clampBrightness(blended, 0.55, 0.9);
  return applyExposureContrast(clamped, ex, ct);
}

export function drawVilla(
  p: ShapeCanvas,
  _cx: number,
  _cy: number,
  _r: number,
  opts: ShapeDrawOptions<VillaPalette> = {}
): void {
  const pal = opts.palette ?? (opts.darkMode ? VILLA_DARK_PALETTE : VILLA_BASE_PALETTE);
  const cell = opts.cell;
  const f = opts.footprint;
  if (!cell || !f) return;
  const gradientRGB = opts.gradientRGB ?? undefined;

  const ex = typeof opts.exposure === 'number' ? opts.exposure : 1;
  const ct = typeof opts.contrast === 'number' ? opts.contrast : 1;
  const t = ((typeof opts.timeMs === 'number' ? opts.timeMs : p.millis()) / 1000);

  const baseAlpha = typeof opts.alpha === "number" && Number.isFinite(opts.alpha) ? opts.alpha : 235;
  const opaque = 255;
  const u = clamp01(opts.liveAvg ?? 0.5);
  const liveBlend = clamp01(typeof opts.blend === 'number' ? opts.blend : 1);

  const { x: pxX, y: pxY, w: pxW, h: pxH } = footprintToPx(f, opts);
  const localTileW = pxW / Math.max(1, f.w);
  const localTileH = pxH / Math.max(1, f.h);
  const localTile = Math.min(localTileW, localTileH);
  const smallScale = localTile <= 8;

  // Stable per-instance seed (independent of offscreen center)
  const seedKey = (opts.seedKey ?? opts.seed) ?? `villa|${String(f.r0)}:${String(f.c0)}|${String(f.w)}x${String(f.h)}`;

  function pulseLitWindow(base: RGB, slotKey: ShapeSeed): RGB {
    const oscSeed = hash32(`${String(seedKey)}|window-osc|${String(slotKey)}`);
    const brightnessMin = val(WINDOW_OSC.brightnessMin, rand01(oscSeed ^ 0x27d4eb2f));
    const brightnessMax = val(WINDOW_OSC.brightnessMax, rand01(oscSeed ^ 0xbb67ae85));
    const toned = clampBrightness(base, brightnessMin, brightnessMax);
    const pulsed = oscillateBrightness(toned, t, {
      amp: val(WINDOW_OSC.amp, rand01(oscSeed ^ 0x9e3779b9)),
      speed: val(WINDOW_OSC.speed, rand01(oscSeed ^ 0x85ebca6b)),
      phase: rand01(oscSeed ^ 0xc2b2ae35) * Math.PI * 2,
    });
    return oscillateWindowColor(pulsed, t, oscSeed);
  }

  // ── bottom-center anchored APPEAR/SCALE envelope
  const anchorX = pxX + pxW / 2;
  const anchorY = pxY + pxH;
  const m = applyShapeMods({
    p,
    x: anchorX,
    y: anchorY,
    r: Math.min(pxW, pxH),
    opts: {
      alpha: baseAlpha,
      timeMs: opts.timeMs,
      liveAvg: opts.liveAvg,
      rootAppearK: opts.rootAppearK,
    },
    mods: {
      appear: {
        scaleFrom: 0.0,
        alphaFrom: 0.0,
        anchor: 'bottom-center',
        ease: 'back',
        backOvershoot: 1.25,
      },
      sizeOsc: { mode: 'none' },
    }
  });
  const drawAlpha = (typeof m.alpha === 'number') ? m.alpha : baseAlpha;

  // draw everything inside the appear/scale transform
  p.push();
  p.translate(m.x, m.y);
  p.scale(m.scaleX, m.scaleY);
  p.translate(-anchorX, -anchorY);

  // platform
  {
    const baseH  = VILLA.platform.baseK * cell;
    const s      = clamp01(val(VILLA.platform.scaleRange, u));
    const h      = Math.max(0, Math.min(baseH * s, pxH * 0.22));
    const y      = pxY + pxH - h;

    p.push(); p.noStroke();
    const plat = applyExposureContrast(pal.platform, ex, ct);
    fillRgb(p, plat, drawAlpha);
    p.rect(pxX, y, pxW, h, Math.round(localTile * 0.08));
    p.pop();
  }

  // grass (two blocks with seeded tall side)
  const blockCount = Math.max(1, f.w);
  const colW = pxW / blockCount;
  const baseGrassH = Math.max(1, Math.min(Math.round(localTileH / 3), Math.round(pxH * 0.10)));
  const tallK = 1.55;

  const leftIsTaller = seeded01(seedKey, 'grassSide') < 0.5;

  const grassLight = sampleDirectionalLightRect(
    {
      x: pxX,
      y: pxY + pxH - Math.max(1, Math.round(baseGrassH * tallK)),
      w: pxW,
      h: Math.max(1, Math.round(baseGrassH * tallK)),
    },
    opts.lightCtx ?? null
  );

  let grassTint = opts.darkMode
    ? pickLightBandValue(pal.grass, pal.grassByLight, grassLight.closenessK)
    : pal.grass;
  if (gradientRGB) grassTint = blendRGB(grassTint, gradientRGB, val(VILLA.grass.colorBlend, u));
  if (opts.darkMode) {
    grassTint = clampSaturation(grassTint, VILLA.grass.satRange[0], VILLA.grass.satRange[1], 1);
    grassTint = clampBrightness(grassTint, 0.36, 0.54);
  }
  grassTint = applyExposureContrast(grassTint, ex, ct);

  const rGrass = Math.round(localTile * 0.06);
  p.push(); p.noStroke(); fillRgb(p, grassTint, drawAlpha);

  const grassTopY: number[] = [];
  for (let col = 0; col < blockCount; col++) {
    const isLeft = (col === 0);
    const gH = Math.max(1, Math.round(baseGrassH * ((isLeft === leftIsTaller) ? tallK : 1)));
    const gY = pxY + pxH - gH;
    const gLeft = iround(pxX + col * colW);
    const gRight = iround(pxX + (col + 1) * colW);
    const gX = gLeft;
    const gW = Math.max(1, gRight - gLeft);

    const tl = isLeft ? rGrass : 0;
    const bl = isLeft ? rGrass : 0;
    const tr = isLeft ? 0 : rGrass;
    const br = isLeft ? 0 : rGrass;

    p.rect(gX, gY, gW, gH, tl, tr, br, bl);
    grassTopY[col] = gY;
  }
  p.pop();

  // at most one side-facing
  const sidePresent = seeded01(seedKey, 'whichSidePresent') < VILLA.variants.sideRoofChance;
  const sideIndex = sidePresent ? (seeded01(seedKey, 'sideIndex') < 0.5 ? 0 : 1) : -1;

  const order = sidePresent ? [sideIndex, 1 - sideIndex] : [0, 1];

  const colMetrics = Array.from({ length: blockCount }, (_, col) => {
    const isSideCol = col === sideIndex;
    const gTop = grassTopY[col];
    const r1 = seeded01(`${String(seedKey)}|col${String(col)}`, 'r1');

    const [hMin, hMax] = isSideCol
      ? [VILLA.bodyShape.sideHMinK, VILLA.bodyShape.sideHMaxK]
      : [VILLA.bodyShape.frontHMinK, VILLA.bodyShape.frontHMaxK];
    const hK = hMin + (hMax - hMin) * r1;
    const desiredBodyH = Math.round(colW * hK);

    const roofFrac = isSideCol ? VILLA.roof.triFracSide : VILLA.roof.triFracFront;
    const availH = Math.max(3, gTop - pxY);
    const roofHRaw = Math.round(localTileH * val(roofFrac, u));
    const roofH = clampMinMax(
      roofHRaw,
      smallScale ? 1 : 2,
      Math.max(1, Math.floor(availH * (isSideCol ? 0.38 : 0.45)))
    );
    const minBodyH = isSideCol
      ? (smallScale ? Math.max(2, Math.round(localTileH * 0.7)) : Math.max(4, Math.round(localTileH * 0.82)))
      : (smallScale ? Math.max(2, Math.round(localTileH * 0.9)) : Math.max(6, Math.round(localTileH * 1.15)));
    const maxBodyH = Math.max(minBodyH, availH - roofH);
    const bodyH = clampMinMax(desiredBodyH, minBodyH, maxBodyH);

    return { roofH, bodyH, minBodyH, maxBodyH };
  });

  if (sidePresent && sideIndex >= 0) {
    const frontIndex = 1 - sideIndex;
    const frontMetric = colMetrics[frontIndex];
    const sideMetric = colMetrics[sideIndex];

    const frontTotalH = frontMetric.bodyH + frontMetric.roofH;
    const sideBodyTarget = frontTotalH - sideMetric.roofH;
    sideMetric.bodyH = clampMinMax(
      Math.round(sideBodyTarget * VILLA.sideVolume.heightK),
      sideMetric.minBodyH,
      sideMetric.maxBodyH
    );
  }

  for (const col of order) {
    const isLeftCol = (col === 0);
    const colLeft = iround(pxX + col * colW);
    const colRight = iround(pxX + (col + 1) * colW);
    const x = colLeft;
    const gTop = grassTopY[col];
    const isSide = (col === sideIndex);

    // seeded knobs per column
    const r1 = seeded01(`${String(seedKey)}|col${String(col)}`, 'r1');
    const r2 = seeded01(`${String(seedKey)}|col${String(col)}`, 'r2');
    const rDoorSide = seeded01(`${String(seedKey)}|col${String(col)}`, 'doorSide');
    const rDoor = seeded01(`${String(seedKey)}|col${String(col)}`, 'doorPick');
    const rBush = seeded01(`${String(seedKey)}|col${String(col)}`, 'bush');

    const { roofH, bodyH } = colMetrics[col];
    const bodyY = Math.max(pxY, gTop - bodyH);

    let bodyTint = blendRGB(
      pal.body[Math.floor(r2 * pal.body.length) % pal.body.length],
      { r: 255, g: 255, b: 255 },
      0 // keep palette as-is, later blend with gradient
    );
    if (gradientRGB) bodyTint = blendRGB(bodyTint, gradientRGB, val(VILLA.body.colorBlend, u));
    bodyTint = clampBrightness(bodyTint, VILLA.body.brightnessRange[0], VILLA.body.brightnessRange[1]);
    bodyTint = applyExposureContrast(bodyTint, ex, ct);

    const ix     = colLeft;
    const iColW  = Math.max(1, colRight - colLeft);
    const iBodyY = iround(bodyY);
    const colLight = sampleDirectionalLightRect(
      { x: ix, y: iBodyY, w: iColW, h: Math.max(1, gTop - iBodyY) },
      opts.lightCtx ?? null
    );
    bodyTint = mixRgb(bodyTint, colLight.lightColor, 0.24 * colLight.overallK);

    const rBody = Math.max(0, Math.round(localTile * 0.06));
    const tl = isLeftCol ? rBody : 0;
    const bl = isLeftCol ? rBody : 0;
    const tr = isLeftCol ? 0 : rBody;
    const br = isLeftCol ? 0 : rBody;

    p.push(); p.noStroke();
    fillRgb(p, bodyTint, opaque);
    p.rect(ix, iBodyY, iColW, bodyH, tl, tr, br, bl);
    paintPixelLightBands(
      p,
      { x: ix, y: iBodyY, w: iColW, h: bodyH },
      colLight,
      {
        alpha: opaque,
        highlightColor: mixRgb(bodyTint, colLight.lightColor, 0.52),
        shadowColor: mixRgb(bodyTint, colLight.shadowColor, 0.30),
        corner: rBody,
        sideK: 0.42,
        topK: 0.0,
        shadowK: 0.18,
      }
    );

    // doors/windows + foliage
    let bushOnLeft = Math.floor(rBush * 2) === 0;

    if (!isSide) {
      // FRONT: door + vertical window
      const cellsH = bodyH / cell;
      const low = 1.5;
      const mid = 1.8;

      let dProfile: VillaProfileName = 'short';
      if (cellsH >= low) dProfile = 'mid';
      if (cellsH >  mid) dProfile = 'tall';

      const DOOR_PROFILES: Record<VillaProfileName, { W_FRAC: number; H_FRAC: number; Y_OFFSET_FRAC: number }> = {
        short: { W_FRAC: 0.18, H_FRAC: 0.20, Y_OFFSET_FRAC: 0.00 },
        mid:   { W_FRAC: 0.18, H_FRAC: 0.18, Y_OFFSET_FRAC: 0.00 },
        tall:  { W_FRAC: 0.18, H_FRAC: 0.14, Y_OFFSET_FRAC: -0.02 },
      };
      const dCfg = DOOR_PROFILES[dProfile];

      const doorW = Math.max(smallScale ? 2 : 3, Math.round(iColW * dCfg.W_FRAC));
      const doorH = Math.max(smallScale ? 2 : 4, Math.round(bodyH * dCfg.H_FRAC));
      const doorOnLeft  = rDoorSide < 0.5;
      const doorMargin  = Math.round(iColW * VILLA.door.sideMarginPxK);
      const doorX       = doorOnLeft ? (ix + doorMargin) : (ix + iColW - doorMargin - doorW);
      const doorY       = Math.min(iBodyY + bodyH - doorH, iBodyY + bodyH - doorH + Math.round(bodyH * dCfg.Y_OFFSET_FRAC));

      let doorTint = pal.door[Math.floor(rDoor * pal.door.length) % pal.door.length];
      if (gradientRGB) doorTint = blendRGB(doorTint, gradientRGB, val(VILLA.body.colorBlend, u));
      doorTint = applyExposureContrast(doorTint, ex, ct);
      fillRgb(p, doorTint, drawAlpha);
      p.rect(doorX, doorY, doorW, doorH, Math.round(localTile * 0.03));

      let wProfile: VillaProfileName = 'short';
      if (cellsH >= low) wProfile = 'mid';
      if (cellsH >  mid) wProfile = 'tall';

      const FRONT_WIN: Record<VillaProfileName, WindowProfile> = {
        short: { W_FRAC: 0.15, H_FRAC: 0.22, TOP_FRAC: 0.18, BOT_MARGIN: 6 },
        mid:   { W_FRAC: 0.17, H_FRAC: 0.18, TOP_FRAC: 0.15, BOT_MARGIN: 6 },
        tall:  { W_FRAC: 0.15, H_FRAC: 0.14, TOP_FRAC: 0.13, BOT_MARGIN: 6 },
      };
      const fCfg = FRONT_WIN[wProfile];

      const frontLitChance = clamp01(Math.pow(1 - u, WINDOW_OSC.litCurve) * 1.08);
      const frontLit = seeded01(`${String(seedKey)}|col${String(col)}|front-lit`) < frontLitChance;
      const frontBaseColor = frontLit
        ? pulseLitWindow(pal.window.lit, `front|${String(col)}`)
        : pal.window.dark;
      const winColor = applyExposureContrast(frontBaseColor, ex, ct);

      const wW = Math.max(smallScale ? 2 : 3, Math.round(iColW * fCfg.W_FRAC));
      const wH = Math.max(smallScale ? 2 : 4, Math.round(bodyH * fCfg.H_FRAC));

      const bandTop = iBodyY + Math.round(bodyH * (fCfg.TOP_FRAC ?? 0));
      const bandBot = Math.max(bandTop + 1, doorY - (fCfg.BOT_MARGIN ?? 0));
      const yCenter = bandTop + (bandBot - bandTop) * 0.40;
      const y = Math.round(yCenter - wH / 2);

      const winX = doorOnLeft ? (ix + iColW - doorMargin - wW) : (ix + doorMargin);

      fillRgb(p, winColor, drawAlpha);
      if (y >= iBodyY + 2 && y + wH <= iBodyY + bodyH - 2) {
        p.rect(winX, y, wW, wH, 2);
      }

      bushOnLeft = !doorOnLeft;

    } else {
      // SIDE: two small windows
      const cellsH = bodyH / cell;
      const low = 1.5;
      const mid = 1.8;

      let sProfile: VillaProfileName = 'short';
      if (cellsH >= low) sProfile = 'mid';
      if (cellsH >  mid) sProfile = 'tall';

      const SIDE_WIN: Record<VillaProfileName, WindowProfile> = {
        short: { W_FRAC: 0.12, H_FRAC: 0.14, Y_OFF_FRAC: VILLA.windows.sideYOffsetK },
        mid:   { W_FRAC: 0.13, H_FRAC: 0.13, Y_OFF_FRAC: VILLA.windows.sideYOffsetK },
        tall:  { W_FRAC: 0.15, H_FRAC: 0.11, Y_OFF_FRAC: VILLA.windows.sideYOffsetK },
      };
      const sCfg = SIDE_WIN[sProfile];

      const sideLitChance = clamp01(Math.pow(1 - u, WINDOW_OSC.litCurve) * 1.18);
      const sideLit0 = seeded01(`${String(seedKey)}|col${String(col)}|side-lit|0`) < sideLitChance;
      const sideLit1 = seeded01(`${String(seedKey)}|col${String(col)}|side-lit|1`) < clamp01(sideLitChance - 0.16);
      const sideBase0 = sideLit0
        ? pulseLitWindow(pal.window.lit, `side|${String(col)}|0`)
        : pal.window.dark;
      const sideBase1 = sideLit1
        ? pulseLitWindow(pal.window.lit, `side|${String(col)}|1`)
        : pal.window.dark;
      const c0 = applyExposureContrast(sideBase0, ex, ct);
      const c1 = applyExposureContrast(sideBase1, ex, ct);

      const wW = Math.max(smallScale ? 2 : 3, Math.round(iColW * sCfg.W_FRAC));
      const wH = Math.max(smallScale ? 2 : 3, Math.round(bodyH * sCfg.H_FRAC));

      const yCenter = iBodyY + Math.round(bodyH * (sCfg.Y_OFF_FRAC ?? 0));
      const y = Math.round(yCenter - wH / 2);
      const leftCx  = ix + Math.round(iColW * 0.35);
      const rightCx = ix + Math.round(iColW * 0.65);

      if (y >= iBodyY + 2 && y + wH <= iBodyY + bodyH - 2) {
        fillRgb(p, c0, drawAlpha); p.rect(leftCx  - Math.round(wW / 2), y, wW, wH, 2);
        fillRgb(p, c1, drawAlpha); p.rect(rightCx - Math.round(wW / 2), y, wW, wH, 2);
      }
    }

    // Foliage (front bush)
    if (!isSide) {
      const F = VILLA.foliage;

      const baseW = iColW * F.baseWk;
      const baseH = iColW * F.baseHk;

      const foliageScaleK = Math.min(1, Math.max(0.2, localTile / 16));
      const outerInset = F.offsetEdgePx * foliageScaleK;
      const jitter = (rBush * 2 - 1) * F.jitterPx * foliageScaleK;

      const edgeX = bushOnLeft ? (ix + outerInset) : (ix + iColW - outerInset);
      const cx    = Math.max(ix + baseW * 0.5, Math.min(ix + iColW - baseW * 0.5, (bushOnLeft ? (edgeX + baseW * 0.5) : (edgeX - baseW * 0.5)) + jitter));
      const cy    = grassTopY[col];

      const s = val(F.scaleRange, u);
      const speed = F.wind.speedRange[0] + (F.wind.speedRange[1]-F.wind.speedRange[0]) * r1;
      const phase = rBush * F.wind.phaseJitter;

      const { x: bx, y: by, scaleX, scaleY, rotation } = applyShapeMods({
        p, x: cx, y: cy, r: baseH, opts,
        mods: {
          scale2D:    { x: s, y: s, anchor: 'bottom-center' },
          scale2DOsc: { mode:'relative', biasX:1, ampX:F.wind.xShearAmp, biasY:1, ampY:0, speed, phaseX:phase, anchor:'bottom-center' },
          rotationOsc:{ amp:F.wind.rotAmp, speed, phase }
        }
      });

      const w = baseW * scaleX;
      const h = baseH * scaleY;

      const bushLight = sampleDirectionalLightRect(
        { x: bx - w / 2, y: by - h, w, h },
        opts.lightCtx ?? null
      );
      const bushColor = treeTintFromGrass(grassTint, u, gradientRGB, ex, ct, {
        darkMode: !!opts.darkMode,
        lightSample: bushLight,
        palette: pal,
        seedKey: `${String(seedKey)}|front-bush|${String(col)}`,
        blend: liveBlend,
      });
      const bushTint = mixRgb(bushColor, bushLight.lightColor, 0.18 * bushLight.overallK);
      const bushHighlight = mixRgb(bushTint, bushLight.lightColor, 0.34);
      const bushShadow = mixRgb(bushTint, bushLight.shadowColor, 0.24);

      p.push();
      p.translate(bx, by);
      p.rotate(rotation);
      p.noStroke();
      fillRgb(p, bushTint, opaque);
      const bushCorner = Math.min(localTile * 0.18, h * 0.4);
      p.rect(-w / 2, -h, w, h, bushCorner);
      paintPixelLightBands(
        p,
        { x: -w / 2, y: -h, w, h },
        bushLight,
        {
          alpha: opaque,
          highlightColor: bushHighlight,
          shadowColor: bushShadow,
          corner: bushCorner,
          sideK: 0.40,
          topK: 0.24,
          shadowK: 0.18,
        }
      );
      p.pop();
    }

    // Roofs (unchanged logic)
    if (!isSide) {
      const ridgeY = iround(Math.max(pxY, bodyY - roofH));
      const apexX = ix + iColW / 2;
      const baseY = iBodyY + Math.min(2, Math.max(1, Math.floor(bodyH * 0.14)));
      const safeRidgeY = Math.min(ridgeY, baseY - 1);

      const strokeCol = applyExposureContrast(darken(bodyTint, 0.72), ex, ct);

      p.noStroke();
      fillRgb(p, bodyTint, opaque);
      p.beginShape();
      p.vertex(ix,         baseY);
      p.vertex(ix + iColW, baseY);
      p.vertex(apexX,      safeRidgeY);
      p.endShape(p.CLOSE);

      p.strokeWeight(Math.max(1, Math.round(localTile * 0.06)));
      strokeRgb(p, strokeCol, opaque);
      p.noFill();
      p.line(apexX, safeRidgeY, ix,         baseY);
      p.line(apexX, safeRidgeY, ix + iColW, baseY);
    } else {
      const roofTint = mixRgb(applyExposureContrast(darken(bodyTint, 0.72), ex, ct), colLight.lightColor, 0.18 * colLight.overallK);
      const roofRectH = Math.max(1, roofH - Math.max(1, Math.round(localTileH * 0.08)));
      const topY = Math.max(pxY, iBodyY - roofRectH);

      const extend = Math.max(0, Math.round(iColW * VILLA.roof.extendK));
      const innerOverlap = Math.max(1, Math.round(iColW * 0.18));
      const leftInset = Math.max(1, Math.round(iColW * 0.08));
      let rx, rw;
      if (isLeftCol) {
        rx = ix + leftInset - Math.round(iColW * 0.07);
        rw = iColW + innerOverlap - leftInset + Math.round(iColW * 0.3);
      } else {
        rx = ix - extend - innerOverlap + leftInset;
        rw = iColW + extend + innerOverlap - leftInset;
      }

      p.noStroke();
      fillRgb(p, roofTint, opaque);
      p.rect(rx, topY, Math.max(1, rw), roofRectH);

      // Side foliage triangles (unchanged aside from seeded phase above)
      const F = VILLA.foliage;
      const baseCX = isLeftCol ? (x + colW * 0.20) : (x + colW * 0.80);
      const baseCY = grassTopY[col];

      const baseTriH  = Math.max(1, localTileH * F.triHk);
      const baseHalfW = Math.max(0.75, localTileW * 0.20);

      const s     = val(F.scaleRange, u);
      const speed = F.wind.speedRange[0] + (F.wind.speedRange[1]-F.wind.speedRange[0]) * r1;
      const phase = rBush * F.wind.phaseJitter;

      const lowRes = applyShapeMods({
        p, x: baseCX, y: baseCY, r: baseTriH, opts,
        mods: {
          scale2D:    { x: s, y: s, anchor: 'bottom-center' },
          scale2DOsc: { mode:'relative', biasX:1, ampX:F.wind.xShearAmp, biasY:1, ampY:0, speed, phaseX:phase, anchor:'bottom-center' },
          rotationOsc:{ amp:F.wind.rotAmp, speed, phase }
        }
      });

      const topRes = applyShapeMods({
        p, x: baseCX, y: baseCY, r: baseTriH, opts,
        mods: {
          scale2D:    { x: s, y: s, anchor: 'bottom-center' },
          scale2DOsc: { mode:'relative', biasX:1, ampX:F.wind.xShearAmp*1.1, biasY:1, ampY:0, speed, phaseX:phase + 0.6, anchor:'bottom-center' },
          rotationOsc:{ amp:F.wind.rotAmp * F.wind.rotAmpTopMul, speed, phase: phase + 0.6 }
        }
      });

      const treeLight = sampleDirectionalLightRect(
        { x: baseCX - baseHalfW, y: baseCY - baseTriH * 1.8, w: baseHalfW * 2, h: baseTriH * 1.8 },
        opts.lightCtx ?? null
      );
      let treeColor = treeTintFromGrass(grassTint, u, gradientRGB, ex, ct, {
        darkMode: !!opts.darkMode,
        lightSample: treeLight,
        palette: pal,
        seedKey: `${String(seedKey)}|side-tree|${String(col)}`,
        blend: liveBlend,
      });
      treeColor = mixRgb(treeColor, treeLight.lightColor, 0.16 * treeLight.overallK);
      const treeHighlight = mixRgb(treeColor, treeLight.lightColor, 0.32);
      const treeShadow = mixRgb(treeColor, treeLight.shadowColor, 0.22);
      p.noStroke();
      fillRgb(p, treeColor, opaque);

      {
        const triH  = baseTriH  * lowRes.scaleY;
        const halfW = baseHalfW * lowRes.scaleX;

        p.push();
        p.translate(lowRes.x, lowRes.y);
        p.rotate(lowRes.rotation);
        p.beginShape();
        p.vertex(-halfW, 0);
        p.vertex( halfW, 0);
        p.vertex( 0,     -triH);
        p.endShape(p.CLOSE);
        paintDirectionalTriangleBands(
          p,
          {
            leftX: -halfW,
            rightX: halfW,
            baseY: 0,
            apexX: 0,
            apexY: -triH,
          },
          treeLight,
          {
            alpha: opaque,
            highlightColor: treeHighlight,
            shadowColor: treeShadow,
          }
        );
        p.pop();
      }

      {
        const triH  = baseTriH  * topRes.scaleY;
        const halfW = baseHalfW * 0.75 * topRes.scaleX;

        p.push();
        p.translate(topRes.x, topRes.y);
        p.rotate(topRes.rotation);
        const midY  = -(baseTriH * s);
        const baseY = midY + Math.round(triH * 0.40);
        const tipY  = baseY - Math.round(triH * 0.80);
        p.beginShape();
        p.vertex(-halfW, baseY);
        p.vertex( halfW, baseY);
        p.vertex( 0,     tipY);
        p.endShape(p.CLOSE);
        paintDirectionalTriangleBands(
          p,
          {
            leftX: -halfW,
            rightX: halfW,
            baseY,
            apexX: 0,
            apexY: tipY,
          },
          treeLight,
          {
            alpha: opaque,
            highlightColor: treeHighlight,
            shadowColor: treeShadow,
          }
        );
        p.pop();
      }
    }

    p.pop();
  }

  p.pop();
}
