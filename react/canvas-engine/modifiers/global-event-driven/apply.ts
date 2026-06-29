import { clamp01 } from "../shape-modifiers/ranges";
import { applyAnchorShiftForScale, easeOutBack, easeOutCubic } from "../shape-modifiers/transformMath";
import type { ShapeMods } from "../shape-modifiers/types";
import { resolveAppear } from "./appear";
import { selectScale } from "./select";

interface ShapeModifierClock {
  millis(): number;
}

interface ApplyShapeModsOpts {
  p: ShapeModifierClock;
  x: number;
  y: number;
  r: number;
  opts?: {
    alpha?: number;
    timeMs?: number;
    rootAppearK?: number;
    selectK?: number;
  };
  mods?: ShapeMods;
}

function finiteOr(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function applyShapeMods({ p, x, y, r, opts = {}, mods = {} }: ApplyShapeModsOpts) {
  const t = (typeof opts.timeMs === "number" ? opts.timeMs : p.millis()) / 1000;

  let mx = x;
  let my = y;
  let mr = r;
  let alpha = typeof opts.alpha === "number" && Number.isFinite(opts.alpha) ? opts.alpha : 255;
  let rotation = 0;
  let satFactor = 1;

  let scaleX = 1;
  let scaleY = 1;

  const appear = resolveAppear(mods.appear, typeof opts.rootAppearK === "number");
  if (appear) {
    const { scaleFrom, alphaFrom, anchor, ease, backOvershoot } = appear;

    const kIn = typeof opts.rootAppearK === "number" ? opts.rootAppearK : 1;
    let k = clamp01(kIn);
    if (ease === "cubic") k = easeOutCubic(k);
    else if (ease === "back") k = easeOutBack(k, backOvershoot);

    const s = scaleFrom + (1 - scaleFrom) * k;

    const dx = r * (s - 1);
    const dy = r * (s - 1);
    const { offX, offY } = applyAnchorShiftForScale(anchor, dx, dy);
    mx += offX;
    my += offY;
    scaleX *= s;
    scaleY *= s;

    const aMul = alphaFrom + (1 - alphaFrom) * k;
    alpha = clamp01((alpha * aMul) / 255) * 255;
  }

  if (mods.scale && typeof mods.scale.value === "number") {
    const baseR = r * mods.scale.value;
    const delta = baseR - r;
    const { offX, offY } = applyAnchorShiftForScale(mods.scale.anchor ?? "center", delta, delta);
    mx += offX;
    my += offY;
    mr = baseR;
  }

  if (mods.scale2D) {
    const ax = Math.max(0, mods.scale2D.x ?? 1);
    const ay = Math.max(0, mods.scale2D.y ?? 1);
    const anchor = mods.scale2D.anchor ?? "center";
    const dx = r * (ax - 1);
    const dy = r * (ay - 1);
    const { offX, offY } = applyAnchorShiftForScale(anchor, dx, dy);
    mx += offX;
    my += offY;
    scaleX *= ax;
    scaleY *= ay;
  }

  if (mods.sizeOsc && mods.sizeOsc.mode !== "none") {
    const { mode = "relative", speed = 0.3, phase = 0, anchor = "center", bias, amp, biasAbs, ampAbs } =
      mods.sizeOsc;

    const r0 = mr;
    let biasK = 1;
    let ampK = 0;

    if (mode === "absolute") {
      const bAbs = typeof biasAbs === "number" ? biasAbs : r0;
      const aAbs = typeof ampAbs === "number" ? ampAbs : 0;
      biasK = bAbs / Math.max(1e-6, r0);
      ampK = aAbs / Math.max(1e-6, r0);
    } else {
      biasK = typeof bias === "number" ? bias : 1;
      ampK = typeof amp === "number" ? amp : 0.1;
    }

    const osc = Math.sin(t * speed * Math.PI * 2 + phase);
    const newR = r0 * (biasK + ampK * osc);
    const delta = newR - r0;

    const { offX, offY } = applyAnchorShiftForScale(anchor, delta, delta);
    mx += offX;
    my += offY;

    mr = newR;
  }

  if (mods.scale2DOsc) {
    const {
      mode = "relative",
      biasX = 1,
      ampX = 0,
      biasY = 1,
      ampY = 0,
      biasAbsX,
      ampAbsX,
      biasAbsY,
      ampAbsY,
      speed = 0.3,
      phaseX = 0,
      phaseY = Math.PI / 2,
      anchor = "center",
    } = mods.scale2DOsc;

    let bx = biasX,
      by = biasY,
      ax = ampX,
      ay = ampY;

    if (mode === "absolute") {
      const base = Math.max(1e-6, mr);
      bx = typeof biasAbsX === "number" ? biasAbsX / base : 1;
      by = typeof biasAbsY === "number" ? biasAbsY / base : 1;
      ax = typeof ampAbsX === "number" ? ampAbsX / base : 0;
      ay = typeof ampAbsY === "number" ? ampAbsY / base : 0;
    }

    const kx = bx + ax * Math.sin(t * speed * Math.PI * 2 + phaseX);
    const ky = by + ay * Math.sin(t * speed * Math.PI * 2 + phaseY);

    const dx = mr * (kx - 1);
    const dy = mr * (ky - 1);
    const { offX, offY } = applyAnchorShiftForScale(anchor, dx, dy);
    mx += offX;
    my += offY;

    scaleX *= Math.max(0, kx);
    scaleY *= Math.max(0, ky);
  }

  if (mods.translateOscX) {
    const amp = finiteOr(mods.translateOscX.amp, 0);
    const speed = finiteOr(mods.translateOscX.speed, 0.25);
    const phase = finiteOr(mods.translateOscX.phase, 0);
    mx += amp * Math.sin(speed * 2 * Math.PI * t + phase);
  }

  if (mods.translateOscY) {
    const amp = finiteOr(mods.translateOscY.amp, 0);
    const speed = finiteOr(mods.translateOscY.speed, 0.25);
    const phase = finiteOr(mods.translateOscY.phase, Math.PI / 2);
    my += amp * Math.sin(speed * 2 * Math.PI * t + phase);
  }

  if (mods.translateClampX) {
    const { min, max } = mods.translateClampX;
    if (typeof min === "number" && Number.isFinite(min)) mx = Math.max(min, mx);
    if (typeof max === "number" && Number.isFinite(max)) mx = Math.min(max, mx);
  }

  if (mods.translateClampY) {
    const { min, max } = mods.translateClampY;
    if (typeof min === "number" && Number.isFinite(min)) my = Math.max(min, my);
    if (typeof max === "number" && Number.isFinite(max)) my = Math.min(max, my);
  }

  if (mods.opacityOsc) {
    const { amp = 80, speed = 0.4, phase = 0 } = mods.opacityOsc;
    alpha = clamp01((alpha + amp * Math.sin(t * speed * Math.PI * 2 + phase)) / 255) * 255;
  }

  if (mods.rotation) {
    const { speed = 0.5, phase = 0 } = mods.rotation;
    rotation += phase + t * speed;
  }

  if (mods.rotationOsc) {
    const { amp = Math.PI / 16, speed = 0.6, phase = 0 } = mods.rotationOsc;
    rotation += amp * Math.sin(t * speed * Math.PI * 2 + phase);
  }

  if (mods.saturationOsc) {
    const { amp = 0.1, speed = 0.2, phase = 0 } = mods.saturationOsc;
    satFactor = 1 + amp * Math.sin(t * speed * Math.PI * 2 + phase);
  }

  const selectK = opts.selectK ?? 0;
  if (selectK > 0) {
    const s = selectScale(selectK);
    const delta = r * (s - 1);
    const { offX, offY } = applyAnchorShiftForScale("bottom-center", delta, delta);
    mx += offX;
    my += offY;
    scaleX *= s;
    scaleY *= s;
  }

  return { x: mx, y: my, r: mr, alpha, rotation, satFactor, scaleX, scaleY };
}
