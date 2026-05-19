// modifiers/particles/particle-1.ts
// Deterministic stratified spawning (no per-frame reseed bursts).
// Pool mode (fixed count + respawn).
// Optional live-follow smoothing so size/length can track changing inputs smoothly.

import type {
  ParticleAccel,
  ParticleCanvas,
  ParticleEdgeFade,
  ParticleJitter,
  ParticleRange,
  ParticleRect,
  ParticleSpawnArea,
  ParticleSpawnMode,
  RandomSource,
  RGBA,
} from "./types";
import { clamp01, hzLerp, makePRNG, mix, randRange, smoothstep01 } from "./utils";

export type ParticleMode = "dot" | "line";

export interface ParticleEmitterOpts {
  key: string; // stable key to persist particles (e.g. `${r0}:${c0}:${w}x${h}:rain`)
  rect: ParticleRect; // pixels
  mode?: ParticleMode;

  spawnMode?: ParticleSpawnMode;
  respawnStratified?: boolean;

  color?: RGBA | ((pr: Particle) => RGBA | undefined);

  spawn?: ParticleSpawnArea;

  speed?: ParticleRange;
  angle?: ParticleRange;
  accel?: ParticleAccel;
  gravity?: number;
  jitter?: ParticleJitter;

  count?: number;
  size?: ParticleRange;
  length?: ParticleRange;

  sizeHz?: number;
  lenHz?: number;

  lifetime?: ParticleRange;
  fadeInFrac?: number;
  fadeOutFrac?: number;

  edgeFadePx?: ParticleEdgeFade;

  respawn?: boolean;

  /** Multiplier for line stroke thickness in texture pixels (sprite path can boost). */
  thicknessScale?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  len: number;
  uSlot: number;
}

interface EmitterState {
  particles: Particle[];
  seed: number;
  rnd: RandomSource;
}

function hashParticleKey(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function spawnOne(
  rnd: RandomSource,
  rect: ParticleRect,
  jPos: number,
  sx0: number,
  sx1: number,
  sy0: number,
  sy1: number,
  spMin: number,
  spMax: number,
  angMin: number,
  angMax: number,
  jAng: number,
  rMin: number,
  rMax: number,
  lMin: number,
  lMax: number,
  lifeMin: number,
  lifeMax: number,
  uSlot: number
): Particle {
  const ux = mix(sx0, sx1, uSlot);
  const uy = randRange(rnd, sy0, sy1);
  const x = rect.x + ux * rect.w + (rnd() * 2 - 1) * jPos;
  const y = rect.y + uy * rect.h + (rnd() * 2 - 1) * jPos;

  const sp = randRange(rnd, spMin, spMax);
  const ang = randRange(rnd, angMin - jAng, angMax + jAng);
  const vx = Math.cos(ang) * sp;
  const vy = Math.sin(ang) * sp;

  const life = randRange(rnd, lifeMin, lifeMax);
  const size = randRange(rnd, rMin, rMax);
  const len = randRange(rnd, lMin, lMax);

  const age = rnd() * life;

  return { x, y, vx, vy, age, life, size, len, uSlot };
}

function ensureEmitter(opts: ParticleEmitterOpts): EmitterState {
  const key = opts.key;
  let st = EMITTERS.get(key);

  const wantCount = Math.max(1, Math.floor(opts.count ?? 32));
  const seed = hashParticleKey(key);

  if (!st) {
    const rnd = makePRNG(seed);
    const rect = opts.rect;

    const spawn = opts.spawn ?? {};
    const sx0 = spawn.x0 ?? 0,
      sx1 = spawn.x1 ?? 1;
    const sy0 = spawn.y0 ?? 0,
      sy1 = spawn.y1 ?? 0;

    const speed = opts.speed ?? {};
    const spMin = speed.min ?? 120;
    const spMax = speed.max ?? 220;

    const angle = opts.angle ?? {};
    const angMin = angle.min ?? Math.PI / 2;
    const angMax = angle.max ?? Math.PI / 2;

    const jitter = opts.jitter ?? {};
    const jPos = jitter.pos ?? 0;
    const jAng = jitter.velAngle ?? 0;

    const size = opts.size ?? {};
    const rMin = size.min ?? 1;
    const rMax = size.max ?? 2.5;

    const len = opts.length ?? {};
    const lMin = len.min ?? 6;
    const lMax = len.max ?? 12;

    const life = opts.lifetime ?? {};
    const lifeMin = Math.max(0.05, life.min ?? 0.6);
    const lifeMax = Math.max(lifeMin, life.max ?? 1.8);

    const spawnMode = opts.spawnMode ?? "stratified";

    const particles = Array.from({ length: wantCount }, (_, i) => {
      const lane = spawnMode === "stratified" ? (i + rnd()) / wantCount : rnd();
      return spawnOne(
        rnd,
        rect,
        jPos,
        sx0,
        sx1,
        sy0,
        sy1,
        spMin,
        spMax,
        angMin,
        angMax,
        jAng,
        rMin,
        rMax,
        lMin,
        lMax,
        lifeMin,
        lifeMax,
        lane
      );
    });

    st = { particles, seed, rnd };
    EMITTERS.set(key, st);
    return st;
  }

  const rnd = st.rnd;
  const rect = opts.rect;

  const spawn = opts.spawn ?? {};
  const sx0 = spawn.x0 ?? 0,
    sx1 = spawn.x1 ?? 1;
  const sy0 = spawn.y0 ?? 0,
    sy1 = spawn.y1 ?? 0;

  const speed = opts.speed ?? {};
  const spMin = speed.min ?? 120;
  const spMax = speed.max ?? 220;

  const angle = opts.angle ?? {};
  const angMin = angle.min ?? Math.PI / 2;
  const angMax = angle.max ?? Math.PI / 2;

  const jPos = opts.jitter?.pos ?? 0;
  const jAng = opts.jitter?.velAngle ?? 0;

  const rMin = opts.size?.min ?? 1;
  const rMax = opts.size?.max ?? 2.5;

  const lMin = opts.length?.min ?? 6;
  const lMax = opts.length?.max ?? 12;

  const lifeMin = Math.max(0.05, opts.lifetime?.min ?? 0.6);
  const lifeMax = Math.max(lifeMin, opts.lifetime?.max ?? 1.8);

  const spawnMode = opts.spawnMode ?? "stratified";

  const cur = st.particles.length;
  if (cur < wantCount) {
    for (let i = cur; i < wantCount; i++) {
      const lane = spawnMode === "stratified" ? (i + rnd()) / wantCount : rnd();
      st.particles.push(
        spawnOne(
          rnd,
          rect,
          jPos,
          sx0,
          sx1,
          sy0,
          sy1,
          spMin,
          spMax,
          angMin,
          angMax,
          jAng,
          rMin,
          rMax,
          lMin,
          lMax,
          lifeMin,
          lifeMax,
          lane
        )
      );
    }
  } else if (cur > wantCount) {
    st.particles.length = wantCount;
  }

  return st;
}

const EMITTERS = new Map<string, EmitterState>();

export function stepAndDrawParticles(p: ParticleCanvas, opts: ParticleEmitterOpts, dtSec: number) {
  const state = ensureEmitter(opts);
  const rect = opts.rect;

  const mode: ParticleMode = opts.mode ?? "dot";
  const spawnMode = opts.spawnMode ?? "stratified";
  const keepLane = opts.respawnStratified ?? true;

  const accX = opts.accel?.x ?? 0;
  const accY = (opts.accel?.y ?? 0) + (opts.gravity ?? 0);

  const fadeInFrac = clamp01(opts.fadeInFrac ?? 0.1);
  const fadeOutFrac = clamp01(opts.fadeOutFrac ?? 0.2);

  const ef = opts.edgeFadePx ?? {};
  const fL = Math.max(0, ef.left ?? 0);
  const fR = Math.max(0, ef.right ?? 0);
  const fT = Math.max(0, ef.top ?? 0);
  const fB = Math.max(0, ef.bottom ?? 0);

  const respawn = opts.respawn !== false;
  const rnd = state.rnd;

  const spawn = opts.spawn ?? {};
  const sx0 = spawn.x0 ?? 0,
    sx1 = spawn.x1 ?? 1;
  const sy0 = spawn.y0 ?? 0,
    sy1 = spawn.y1 ?? 0;

  const speed = opts.speed ?? {};
  const spMin = speed.min ?? 120;
  const spMax = speed.max ?? 220;

  const angle = opts.angle ?? {};
  const angMin = angle.min ?? Math.PI / 2;
  const angMax = angle.max ?? Math.PI / 2;

  const jPos = opts.jitter?.pos ?? 0;
  const jAng = opts.jitter?.velAngle ?? 0;

  const rMin = opts.size?.min ?? 1;
  const rMax = opts.size?.max ?? 2.5;

  const lMin = opts.length?.min ?? 6;
  const lMax = opts.length?.max ?? 12;

  const lifeMin = Math.max(0.05, opts.lifetime?.min ?? 0.6);
  const lifeMax = Math.max(lifeMin, opts.lifetime?.max ?? 1.8);

  const sizeHz = typeof opts.sizeHz === "number" && Number.isFinite(opts.sizeHz) ? opts.sizeHz : 0;
  const lenHz = typeof opts.lenHz === "number" && Number.isFinite(opts.lenHz) ? opts.lenHz : 0;
  const wantSizeFollow = sizeHz > 0 && rMax !== rMin;
  const wantLenFollow = lenHz > 0 && lMax !== lMin;

  function laneTargetSize(uSlot: number) {
    return rMin + (rMax - rMin) * uSlot;
  }
  function laneTargetLen(uSlot: number) {
    return lMin + (lMax - lMin) * uSlot;
  }

  function respawnParticle(pr: Particle, idx: number, total: number) {
    if (!(spawnMode === "stratified" && keepLane)) {
      pr.uSlot = spawnMode === "stratified" ? (idx + rnd()) / Math.max(1, total) : rnd();
    }

    const ux = mix(sx0, sx1, pr.uSlot);
    const uy = randRange(rnd, sy0, sy1);

    pr.x = rect.x + ux * rect.w + (rnd() * 2 - 1) * jPos;
    pr.y = rect.y + uy * rect.h + (rnd() * 2 - 1) * jPos;

    const sp = randRange(rnd, spMin, spMax);
    const ang = randRange(rnd, angMin - jAng, angMax + jAng);
    pr.vx = Math.cos(ang) * sp;
    pr.vy = Math.sin(ang) * sp;

    pr.life = randRange(rnd, lifeMin, lifeMax);
    pr.age = rnd() * pr.life;

    pr.size = randRange(rnd, rMin, rMax);
    pr.len = randRange(rnd, lMin, lMax);
  }

  for (const [i, pr] of state.particles.entries()) {

    pr.vx += accX * dtSec;
    pr.vy += accY * dtSec;
    pr.x += pr.vx * dtSec;
    pr.y += pr.vy * dtSec;
    pr.age += dtSec;

    if (wantSizeFollow) {
      pr.size = hzLerp(pr.size, laneTargetSize(pr.uSlot), sizeHz, dtSec);
    }
    if (wantLenFollow) {
      pr.len = hzLerp(pr.len, laneTargetLen(pr.uSlot), lenHz, dtSec);
    }

    const alive = pr.age <= pr.life;
    const inside =
      pr.x >= rect.x &&
      pr.x <= rect.x + rect.w &&
      pr.y >= rect.y &&
      pr.y <= rect.y + rect.h;

    if ((!alive || !inside) && respawn) {
      respawnParticle(pr, i, state.particles.length);
    }
  }

  p.push();

  for (const pr of state.particles) {

    let baseColor: RGBA;
    if (typeof opts.color === "function") {
      baseColor = opts.color(pr) ?? { r: 255, g: 255, b: 255, a: 255 };
    } else if (opts.color) {
      baseColor = opts.color;
    } else {
      baseColor = { r: 200, g: 220, b: 255, a: 160 };
    }

    const aBase = baseColor.a ?? 255;

    const tLife = clamp01(pr.age / pr.life);
    const fIn = fadeInFrac > 0 ? smoothstep01(tLife / Math.max(1e-6, fadeInFrac)) : 1;
    const fOut = fadeOutFrac > 0 ? smoothstep01((1 - tLife) / Math.max(1e-6, fadeOutFrac)) : 1;
    let alpha = aBase * fIn * fOut;

    const dL = pr.x - rect.x;
    const dR = rect.x + rect.w - pr.x;
    const dT = pr.y - rect.y;
    const dB = rect.y + rect.h - pr.y;

    const eL = fL > 0 ? smoothstep01(dL / fL) : 1;
    const eR = fR > 0 ? smoothstep01(dR / fR) : 1;
    const eT = fT > 0 ? smoothstep01(dT / fT) : 1;
    const eB = fB > 0 ? smoothstep01(dB / fB) : 1;

    alpha *= eL * eR * eT * eB;
    alpha = Math.max(0, Math.min(255, alpha));

    if (mode === "dot") {
      p.noStroke();
      p.fill(baseColor.r, baseColor.g, baseColor.b, alpha);
      p.circle(pr.x, pr.y, pr.size * 2);
    } else {
      const vLen = Math.hypot(pr.vx, pr.vy) || 1;
      const ux = pr.vx / vLen;
      const uy = pr.vy / vLen;
      const x2 = pr.x - ux * pr.len;
      const y2 = pr.y - uy * pr.len;

      const norm = (pr.size - rMin) / Math.max(1e-6, rMax - rMin);
      const n01 = norm < 0 ? 0 : norm > 1 ? 1 : norm;
      const baseThick = n01 * 2 + 1;

      const dprGuess = typeof window !== "undefined" ? window.devicePixelRatio : 1;
      const dprK = 1 + Math.max(0, Math.min(1.5, dprGuess - 1)) * 0.9;

      const thick =
        baseThick *
        (typeof opts.thicknessScale === "number" && Number.isFinite(opts.thicknessScale)
          ? opts.thicknessScale
          : dprK);

      p.strokeWeight(thick);
      p.stroke(baseColor.r, baseColor.g, baseColor.b, alpha);
      p.line(pr.x, pr.y, x2, y2);
    }
  }

  p.pop();
}
