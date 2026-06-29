// src/canvas-engine/shapes/car.ts

import {
  applySrgbExposureContrast,
  applyShapeMods,
  beginFitScale,
  blendRGB,
  clampBrightness,
  clampSaturation,
  clamp01,
  endFitScale,
  finiteNumber,
  fitScaleToRectWidth,
  resolveRangeValue,
  footprintToPx,
  sampleDirectionalLightRect,
  pickLightBandValue,
  mixRgb,
  paintPixelLightBands,
  fillRgb,
  pick,
  seededTag01 as rFromKey,
  shapeColorForRenderPass,
  shouldDrawInRenderPass,
} from "../modifiers/index";
import type { LightClosenessBandMap, RGB } from "../modifiers/index";
import type { ShapeCanvas, ShapeDrawOptions, ShapePalette, ShapeSeed } from "./types";
import {
  shapeIdentity,
  shapeLifecycle,
  shapePass,
  shapeProjection,
  shapeSprite,
  shapeStyle,
} from "./options";

interface CarPalette extends ShapePalette {
  grass: RGB[];
  grassByLight?: LightClosenessBandMap<RGB[]>;
  asphalt: RGB;
  body: RGB[];
  window: RGB;
  wheel: RGB;
}

interface CarTuning {
  grass: { colorBlend: [number, number] };
  body: { colorBlend: [number, number] };
  asphalt: { min: [number, number]; max: [number, number] };
  bodyOscY: {
    ampR: [number, number];
    intensity: [number, number];
    speedHz: [number, number];
    phase: [number, number];
  };
}

export type CarVariant = "suv" | "sedan" | "jeep";

interface CarAssetOptions extends ShapeDrawOptions<CarPalette> {
  variant?: CarVariant;
  useAppear?: boolean;
}

type CarDrawOptions = ShapeDrawOptions<CarPalette>;

// Tunables.
const CAR_VARIANTS = { suv: "suv", sedan: "sedan", jeep: "jeep" } as const satisfies Record<CarVariant, CarVariant>;

const CAR: CarTuning = {
  grass: { colorBlend: [0.16, 0.30] },
  body: { colorBlend: [0.04, 0.10] },
  asphalt: { min: [0.25, 0.32], max: [0.52, 0.65] },

  // Body/chassis/window wiggle only; wheels stay locked to the road.
  bodyOscY: {
    ampR: [0.015, 0.01],
    intensity: [1, 0.3],
    speedHz: [4, 0.35],
    phase: [0.00, 0.00],
  },
};

// Palettes.
const CAR_BASE_PALETTE: CarPalette = {
  grass: [
    { r: 110, g: 160, b: 90 },
    { r: 130, g: 180, b: 110 },
    { r: 100, g: 150, b: 85 },
  ],
  asphalt: { r: 125, g: 125, b: 125 },
  body: [
    { r: 210, g: 138, b: 108 },
    { r: 224, g: 158, b: 118 },
    { r: 232, g: 192, b: 130 },
    { r: 144, g: 178, b: 132 },
    { r: 104, g: 142, b: 118 },
    { r: 150, g: 192, b: 186 },
    { r: 126, g: 156, b: 206 },
    { r: 146, g: 186, b: 220 },
    { r: 156, g: 136, b: 198 },
    { r: 206, g: 146, b: 154 },
    { r: 222, g: 212, b: 148 },
    { r: 126, g: 128, b: 134 },
  ],
  window: { r: 154, g: 188, b: 218 },
  wheel: { r: 40, g: 40, b: 40 },
};

const CAR_DARK_PALETTE: CarPalette = {
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
    { r: 86, g: 98, b: 210 },
    { r: 208, g: 92, b: 140 },
    { r: 220, g: 150, b: 96 },
    { r: 76, g: 150, b: 220 },
    { r: 70, g: 176, b: 156 },
    { r: 104, g: 196, b: 116 },
    { r: 150, g: 110, b: 222 },
    { r: 72, g: 170, b: 240 },
    { r: 128, g: 90, b: 210 },
    { r: 92, g: 130, b: 230 },
  ],
  window: { r: 104, g: 116, b: 174 },
  wheel: { r: 22, g: 25, b: 31 },
};

export function drawCarAsset(
  p: ShapeCanvas,
  cx: number,
  wheelY: number,
  r: number,
  opts: CarAssetOptions = {}
): void {
  const style = shapeStyle(opts);
  const lifecycle = shapeLifecycle(opts);
  const identity = shapeIdentity(opts);
  const pass = shapePass(opts);

  const darkMode = style.darkMode === true;
  const pal = style.palette ?? (darkMode ? CAR_DARK_PALETTE : CAR_BASE_PALETTE);
  const ex = finiteNumber(style.exposure, 1);
  const ct = finiteNumber(style.contrast, 1);
  const alpha = finiteNumber(style.alpha, 255);
  const u = clamp01(style.liveAvg ?? 0.5);
  const renderPass = pass.renderPass ?? "color";
  const maskColor = pass.maskColor;
  const maskAlpha =
    typeof pass.maskAlpha === "number" && Number.isFinite(pass.maskAlpha)
      ? pass.maskAlpha
      : alpha;
  const isDepthMaskPass = renderPass === "depthMask";
  const shouldDrawMass = shouldDrawInRenderPass(renderPass, true);
  const shouldDrawColorDetails = shouldDrawInRenderPass(renderPass, false);
  const solidAlpha = isDepthMaskPass ? maskAlpha : 255;

  const seedKey: ShapeSeed =
    (identity.seedKey ?? identity.seed)
    ?? `car-asset|${String(Math.round(cx))}|${String(Math.round(wheelY))}|${String(Math.round(r))}`;

  const rBodyPick = rFromKey(seedKey, "bodyTint");
  const rVariant = rFromKey(seedKey, "variant");
  const rSide = rFromKey(seedKey, "sideBias");

  let bodyTint = pick(pal.body, rBodyPick);
  if (style.gradientRGB) bodyTint = blendRGB(bodyTint, style.gradientRGB, resolveRangeValue(CAR.body.colorBlend, u));
  if (darkMode) bodyTint = clampBrightness(bodyTint, 0.5, 1.0);
  bodyTint = applySrgbExposureContrast(bodyTint, ex, ct);
  const windowTint = applySrgbExposureContrast(pal.window, ex, ct);

  const w = r * 3.2;
  const wheelR = Math.max(1, r * 0.52);

  if (opts.useAppear !== false) {
    const m = applyShapeMods({
      p,
      x: cx,
      y: wheelY,
      r,
      opts: { alpha, timeMs: lifecycle.timeMs ?? p.millis(), rootAppearK: lifecycle.rootAppearK, selectK: lifecycle.selectK },
    });
    p.push();
    p.translate(m.x, m.y);
    p.scale(m.scaleX, m.scaleY);
    p.translate(-cx, -wheelY);
  } else {
    p.push();
  }

  if (shouldDrawColorDetails) {
    fillRgb(p, pal.wheel, 255);
    p.circle(cx - w * 0.38, wheelY, wheelR);
    p.circle(cx + w * 0.38, wheelY, wheelR);
  }

  const baseAmpR = resolveRangeValue(CAR.bodyOscY.ampR, u);
  const intensity = clamp01(resolveRangeValue(CAR.bodyOscY.intensity, u));
  const oscAmp = r * baseAmpR * intensity;
  const oscHz = resolveRangeValue(CAR.bodyOscY.speedHz, u);
  const oscPhase = resolveRangeValue(CAR.bodyOscY.phase, u);

  const mBody = applyShapeMods({
    p,
    x: cx,
    y: 0,
    r,
    opts: { timeMs: lifecycle.timeMs ?? p.millis() },
    mods: { translateOscY: { amp: oscAmp, speed: oscHz, phase: oscPhase } },
  });
  const bodyYOffset = isDepthMaskPass ? 0 : mBody.y;

  const variant: CarVariant =
    opts.variant ?? (rVariant < 0.40 ? CAR_VARIANTS.suv : rVariant < 0.80 ? CAR_VARIANTS.sedan : CAR_VARIANTS.jeep);

  if (variant === CAR_VARIANTS.suv) {
    const h = r * 1.9;
    const bodyCy = wheelY - h * 0.46 + bodyYOffset;
    const bodyRect = { x: cx - w / 2, y: bodyCy - h / 2, w, h };
    const bodyLight = sampleDirectionalLightRect(bodyRect, style.lightCtx ?? null);
    const suvTint = mixRgb(bodyTint, bodyLight.lightColor, 0.28 * bodyLight.overallK);
    const suvHighlight = mixRgb(suvTint, bodyLight.lightColor, 0.46);
    const suvShadow = mixRgb(suvTint, bodyLight.shadowColor, 0.30);

    if (shouldDrawMass) {
      p.noStroke();
      fillRgb(p, shapeColorForRenderPass(renderPass, suvTint, maskColor), solidAlpha);
      p.rect(cx - w / 2, bodyCy - h / 2, w, h, r * 0.42);
    }
    if (shouldDrawColorDetails) {
      paintPixelLightBands(p, bodyRect, bodyLight, {
        alpha: 255,
        highlightColor: suvHighlight,
        shadowColor: suvShadow,
        corner: Math.round(r * 0.42),
        sideK: 0.40,
        topK: 0.28,
        shadowK: 0.18,
      });

      fillRgb(p, windowTint, 255);
      const winH = h * 0.42;
      const winY = bodyCy - h * 0.18 - winH / 2;
      p.rect(cx - w * 0.30, winY, w * 0.60, winH, r * 0.10);
    }
  } else if (variant === CAR_VARIANTS.sedan) {
    const chassisW = w * 0.94;
    const chassisH = Math.max(1, r * 0.40);
    const chassisCy = wheelY - chassisH * 0.55 + bodyYOffset;
    const cabinBottomW = w * 0.70;
    const cabinTopW = cabinBottomW * 0.84;
    const cabinH = Math.max(1, r * 1.05);
    const chassisTopY = chassisCy - chassisH / 2;
    const cabinBaseY = chassisTopY;
    const cabinTopY = cabinBaseY - cabinH;
    const x0 = cx - cabinBottomW / 2;
    const x1 = cx + cabinBottomW / 2;
    const xt0 = cx - cabinTopW / 2;
    const xt1 = cx + cabinTopW / 2;
    const bodyLight = sampleDirectionalLightRect(
      { x: cx - chassisW / 2, y: cabinTopY, w: chassisW, h: wheelY - cabinTopY },
      style.lightCtx ?? null
    );
    const sedanTint = mixRgb(bodyTint, bodyLight.lightColor, 0.26 * bodyLight.overallK);
    const sedanHighlight = mixRgb(sedanTint, bodyLight.lightColor, 0.44);
    const sedanShadow = mixRgb(sedanTint, bodyLight.shadowColor, 0.26);

    if (shouldDrawMass) {
      p.noStroke();
      fillRgb(p, shapeColorForRenderPass(renderPass, sedanTint, maskColor), solidAlpha);
      p.rect(cx - chassisW / 2, chassisCy - chassisH / 2, chassisW, chassisH, r * 0.22);

      fillRgb(p, shapeColorForRenderPass(renderPass, sedanTint, maskColor), solidAlpha);
      p.beginShape();
      p.vertex(x0, cabinBaseY);
      p.vertex(x1, cabinBaseY);
      p.vertex(xt1, cabinTopY);
      p.vertex(xt0, cabinTopY);
      p.endShape(p.CLOSE);
    }

    if (!shouldDrawColorDetails) {
      p.pop();
      return;
    }

    paintPixelLightBands(
      p,
      { x: cx - chassisW / 2, y: chassisCy - chassisH / 2, w: chassisW, h: chassisH },
      bodyLight,
      {
        alpha: 255,
        highlightColor: sedanHighlight,
        shadowColor: sedanShadow,
        corner: Math.round(r * 0.22),
        sideK: 0.36,
        topK: 0.22,
        shadowK: 0.16,
      }
    );

    const litLeft = bodyLight.leftK >= bodyLight.rightK;
    const sideLitK = Math.max(bodyLight.leftK, bodyLight.rightK);

    p.fill(sedanHighlight.r, sedanHighlight.g, sedanHighlight.b, Math.round(255 * 0.34 * sideLitK));
    p.beginShape();
    if (litLeft) {
      p.vertex(x0, cabinBaseY);
      p.vertex(x0 + cabinBottomW * 0.22, cabinBaseY);
      p.vertex(xt0 + cabinTopW * 0.20, cabinTopY);
      p.vertex(xt0, cabinTopY);
    } else {
      p.vertex(x1 - cabinBottomW * 0.22, cabinBaseY);
      p.vertex(x1, cabinBaseY);
      p.vertex(xt1, cabinTopY);
      p.vertex(xt1 - cabinTopW * 0.20, cabinTopY);
    }
    p.endShape(p.CLOSE);

    p.fill(sedanHighlight.r, sedanHighlight.g, sedanHighlight.b, Math.round(255 * 0.22 * bodyLight.topK));
    p.beginShape();
    p.vertex(x0 + cabinBottomW * 0.14, cabinBaseY);
    p.vertex(x1 - cabinBottomW * 0.14, cabinBaseY);
    p.vertex(xt1 - cabinTopW * 0.12, cabinTopY + Math.max(1, r * 0.08));
    p.vertex(xt0 + cabinTopW * 0.12, cabinTopY + Math.max(1, r * 0.08));
    p.endShape(p.CLOSE);

    p.fill(sedanShadow.r, sedanShadow.g, sedanShadow.b, Math.round(255 * 0.16 * sideLitK));
    p.beginShape();
    if (litLeft) {
      p.vertex(x1 - cabinBottomW * 0.18, cabinBaseY);
      p.vertex(x1, cabinBaseY);
      p.vertex(xt1, cabinTopY);
      p.vertex(xt1 - cabinTopW * 0.14, cabinTopY);
    } else {
      p.vertex(x0, cabinBaseY);
      p.vertex(x0 + cabinBottomW * 0.18, cabinBaseY);
      p.vertex(xt0 + cabinTopW * 0.14, cabinTopY);
      p.vertex(xt0, cabinTopY);
    }
    p.endShape(p.CLOSE);

    const insetX = Math.max(1, r * 0.25);
    const insetTop = Math.max(1, r * 0.20);
    const insetBot = Math.max(1, r * 0.28);

    const midW = cabinTopW + (cabinBottomW - cabinTopW) * 0.45;
    const innerW = Math.max(1, midW - insetX * 2);
    const innerH = Math.max(1, cabinBaseY - cabinTopY - insetTop - insetBot);
    const innerX = cx - innerW / 2;
    const innerY = cabinTopY + insetTop;

    const gap = Math.max(2, r * 0.18);
    const eachW = (innerW - gap) / 2;
    const eachH = innerH * 0.72;
    const winY = innerY + (innerH - eachH) * 0.35;

    fillRgb(p, windowTint, 255);
    p.rect(innerX, winY, eachW, eachH, r * 0.10);
    p.rect(innerX + eachW + gap, winY, eachW, eachH, r * 0.10);
  } else {
    const leftAligned = rSide < 0.5;

    const chassisW = w * 0.92;
    const chassisH = Math.max(1, r * 0.65);
    const chassisCy = wheelY - chassisH * 0.58 + bodyYOffset;
    const bodyLight = sampleDirectionalLightRect(
      { x: cx - chassisW / 2, y: wheelY - r * 1.8 + bodyYOffset, w: chassisW, h: r * 1.8 },
      style.lightCtx ?? null
    );
    const jeepTint = mixRgb(bodyTint, bodyLight.lightColor, 0.28 * bodyLight.overallK);
    const jeepHighlight = mixRgb(jeepTint, bodyLight.lightColor, 0.46);
    const jeepShadow = mixRgb(jeepTint, bodyLight.shadowColor, 0.28);

    if (shouldDrawMass) {
      p.noStroke();
      fillRgb(p, shapeColorForRenderPass(renderPass, jeepTint, maskColor), solidAlpha);
      p.rect(cx - chassisW / 2, chassisCy - chassisH / 2, chassisW, chassisH, r * 0.18);
    }
    if (shouldDrawColorDetails) {
      paintPixelLightBands(
        p,
        { x: cx - chassisW / 2, y: chassisCy - chassisH / 2, w: chassisW, h: chassisH },
        bodyLight,
        {
          alpha: 255,
          highlightColor: jeepHighlight,
          shadowColor: jeepShadow,
          corner: Math.round(r * 0.18),
          sideK: 0.40,
          topK: 0.20,
          shadowK: 0.16,
        }
      );
    }

    const cabinW = w * 0.64;
    const cabinH = Math.max(1, r * 1.15);
    const chassisTopY = chassisCy - chassisH / 2;
    const cabinBaseY = chassisTopY;
    const cabinTopY = cabinBaseY - cabinH;

    const sidePad = Math.max(0.5, r * 0.20);
    const cabinX0 = leftAligned
      ? cx - chassisW / 2 + sidePad
      : cx + chassisW / 2 - cabinW - sidePad;

    if (shouldDrawMass) {
      fillRgb(p, shapeColorForRenderPass(renderPass, jeepTint, maskColor), solidAlpha);
      p.rect(cabinX0, cabinTopY, cabinW, cabinH, r * 0.10);
    }
    if (shouldDrawColorDetails) {
      paintPixelLightBands(
        p,
        { x: cabinX0, y: cabinTopY, w: cabinW, h: cabinH },
        bodyLight,
        {
          alpha: 255,
          highlightColor: jeepHighlight,
          shadowColor: jeepShadow,
          corner: Math.round(r * 0.10),
          sideK: 0.32,
          topK: 0.24,
          shadowK: 0.14,
        }
      );
    }

    const pad = Math.max(1, r * 0.22);
    const innerW = cabinW - pad * 2;
    const innerH = cabinH - pad * 2;
    const gap = Math.max(1, r * 0.20);
    const eachW = (innerW - gap) / 2;
    const eachH = innerH * 0.70;
    const winY = cabinTopY + pad + (innerH - eachH) * 0.30;

    if (shouldDrawColorDetails) {
      fillRgb(p, windowTint, 255);
      p.rect(cabinX0 + pad, winY, eachW, eachH, r * 0.08);
      p.rect(cabinX0 + pad + eachW + gap, winY, eachW, eachH, r * 0.08);
    }
  }

  p.pop();
}

export function drawCar(
  p: ShapeCanvas,
  cx: number,
  cy: number,
  r: number,
  opts: CarDrawOptions = {}
): void {
  const projection = shapeProjection(opts);
  const style = shapeStyle(opts);
  const lifecycle = shapeLifecycle(opts);
  const identity = shapeIdentity(opts);
  const sprite = shapeSprite(opts);
  const pass = shapePass(opts);

  const darkMode = style.darkMode === true;
  const pal = style.palette ?? (darkMode ? CAR_DARK_PALETTE : CAR_BASE_PALETTE);
  const ex = finiteNumber(style.exposure, 1);
  const ct = finiteNumber(style.contrast, 1);
  const alpha = finiteNumber(style.alpha, 255);
  const u = clamp01(style.liveAvg ?? 0.5);
  const renderPass = pass.renderPass ?? "color";
  const maskColor = pass.maskColor;
  const maskAlpha =
    typeof pass.maskAlpha === "number" && Number.isFinite(pass.maskAlpha)
      ? pass.maskAlpha
      : alpha;
  const shouldDrawMass = shouldDrawInRenderPass(renderPass, true);
  const shouldDrawColorDetails = shouldDrawInRenderPass(renderPass, false);
  const massAlpha = renderPass === "depthMask" ? maskAlpha : alpha;

  const cell = projection.cell;
  const f = projection.footprint;
  let tileX: number;
  let tileY: number;
  let tileW: number;
  let tileH: number;

  if (cell && f) {
    ({ x: tileX, y: tileY, w: tileW, h: tileH } = footprintToPx(f, projection));
  } else {
    tileW = r * 3.0;
    tileH = r * 3.0;
    tileX = cx - tileW / 2;
    tileY = cy - tileH / 2;
  }

  const cx0 = cell && f ? tileX + tileW / 2 : cx;
  const seedKey: ShapeSeed =
    (identity.seedKey ?? identity.seed)
    ?? `car|${String(Math.round(tileX))}|${String(Math.round(tileY))}|${String(Math.round(tileW))}x${String(Math.round(tileH))}`;

  const rGrass1 = rFromKey(seedKey, "ground:grass1");
  const rGrass2 = rFromKey(seedKey, "ground:grass2");

  const grassH = tileH * 0.5;
  const grassY = tileY + tileH - grassH;
  const aspH = grassH * 0.38;
  const aspY = grassY + (grassH - aspH) / 2;

  const baseY = tileY + tileH;
  const m = applyShapeMods({
    p,
    x: cx0,
    y: baseY,
    r,
    opts: { alpha, timeMs: lifecycle.timeMs, rootAppearK: lifecycle.rootAppearK, selectK: lifecycle.selectK },
  });

  p.push();
  p.translate(m.x, m.y);
  p.scale(m.scaleX, m.scaleY);
  p.translate(-cx0, -baseY);

  const grassLight = sampleDirectionalLightRect(
    { x: tileX, y: grassY, w: tileW, h: grassH },
    style.lightCtx ?? null
  );
  const grassPalette = darkMode
    ? pickLightBandValue(pal.grass, pal.grassByLight, grassLight.closenessK)
    : pal.grass;
  const g1 = pick(grassPalette, rGrass1);
  const g2 = pick(grassPalette, rGrass2);
  let grassTint = blendRGB(g1, g2, 0.4 + 0.3 * u);
  if (style.gradientRGB) grassTint = blendRGB(grassTint, style.gradientRGB, resolveRangeValue(CAR.grass.colorBlend, u));
  if (darkMode) {
    grassTint = clampSaturation(grassTint, 0.0, 0.22, 1);
    grassTint = clampBrightness(grassTint, 0.28, 0.42);
  }
  grassTint = applySrgbExposureContrast(grassTint, ex, ct);
  if (darkMode) {
    const grassLightK = grassLight.overallK * (0.03 + 0.08 * grassLight.closenessK);
    grassTint = mixRgb(grassTint, grassLight.lightColor, grassLightK);
  }

  p.noStroke();
  if (shouldDrawMass) {
    fillRgb(p, shapeColorForRenderPass(renderPass, grassTint, maskColor), massAlpha);
    p.rect(tileX, grassY, tileW, grassH, r * 0.18);
  }

  if (shouldDrawColorDetails) {
    let aspColor = applySrgbExposureContrast(pal.asphalt, ex, ct);
    aspColor = clampBrightness(aspColor, resolveRangeValue(CAR.asphalt.min, u), resolveRangeValue(CAR.asphalt.max, u));
    fillRgb(p, aspColor, alpha);
    p.rect(tileX, aspY, tileW, aspH, r * 0.14);
  }

  const wheelY = aspY + aspH * 0.62;
  const designW = cell && f ? tileW : r * 3.2;
  const designUnit = cell && f ? Math.max(1, tileW / 3.2) : r;
  const sidePad = Math.max(2, tileW * 0.06);
  const s = fitScaleToRectWidth(designW, tileW, sidePad, { allowUpscale: sprite.allowUpscale === true });

  beginFitScale(p, { cx: cx0, anchorY: wheelY, scale: s });
  drawCarAsset(p, cx0, wheelY, designUnit, {
    style: {
      alpha,
      exposure: ex,
      contrast: ct,
      darkMode,
      gradientRGB: style.gradientRGB,
      liveAvg: u,
      lightCtx: style.lightCtx,
    },
    identity: { seedKey },
    pass: {
      renderPass,
      maskColor,
      maskAlpha,
    },
    useAppear: false,
  });
  endFitScale(p);

  p.pop();
}

