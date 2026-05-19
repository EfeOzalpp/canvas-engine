// modifiers/particles/particle-2.ts
// Reusable puff emitter (snow / smoke / exhaust).
// Deterministic stratified pool, persistent RNG, edge fades, lifetime fades.
// Direction presets with angular spread. Dot-only (circles).

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

export type PuffDir = "none" | "up" | "down" | "left" | "right";

export interface PuffEmitterOpts {
  key: string;
  rect: ParticleRect;

  dir?: PuffDir;
  spreadAngle?: number;

  angle?: ParticleRange;

  spawnMode?: ParticleSpawnMode;
  respawnStratified?: boolean;
  spawn?: ParticleSpawnArea;

  speed?: ParticleRange;
  accel?: ParticleAccel;
  gravity?: number;
  jitter?: ParticleJitter;
  drag?: number;

  count?: number;
  size?: ParticleRange;
  sizeHz?: number;

  lifetime?: ParticleRange;
  fadeInFrac?: number;
  fadeOutFrac?: number;

  edgeFadePx?: ParticleEdgeFade;

  color?: RGBA | ((pr: Particle) => RGBA | undefined);

  respawn?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  uSlot: number;
}

interface EmitterState {
  particles: Particle[];
  rnd: RandomSource;
}

function hashPuffKey(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function dirToAngleSpan(dir: PuffDir, spread: number): { min: number; max: number } {
  const BASES: Record<PuffDir, number> = {
    none: Number.NaN,
    down: Math.PI / 2,
    up: -Math.PI / 2,
    right: 0,
    left: Math.PI,
  };
  const base = BASES[dir];
  if (Number.isNaN(base)) return { min: -Math.PI, max: Math.PI };
  return { min: base - spread, max: base + spread };
}

const EMITTERS_2 = new Map<string, EmitterState>();

function ensureEmitter(opts: PuffEmitterOpts): EmitterState {
  const key = opts.key;
  let st = EMITTERS_2.get(key);

  const wantCount = Math.max(1, Math.floor(opts.count ?? 32));
  const seed = hashPuffKey(key);

  const mk = () => {
    const rnd = makePRNG(seed);
    const particles = Array.from({ length: wantCount }, (_, i): Particle => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      life: 1,
      size: 1,
      uSlot: (i + rnd()) / wantCount,
    }));
    return { particles, rnd };
  };

  if (!st) {
    st = mk();
    EMITTERS_2.set(key, st);
  } else if (st.particles.length !== wantCount) {
    if (st.particles.length < wantCount) {
      const rnd = st.rnd;
      for (let i = st.particles.length; i < wantCount; i++) {
        st.particles.push({
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          age: 0,
          life: 1,
          size: 1,
          uSlot: (i + rnd()) / wantCount,
        });
      }
    } else {
      st.particles.length = wantCount;
    }
  }

  return st;
}

export function stepAndDrawPuffs(p: ParticleCanvas, opts: PuffEmitterOpts, dtSec: number) {
  const state = ensureEmitter(opts);
  const rect = opts.rect;

  const spawnMode = opts.spawnMode ?? "stratified";
  const keepLane = opts.respawnStratified ?? true;
  const respawn = opts.respawn !== false;

  const accX = opts.accel?.x ?? 0;
  const accY = (opts.accel?.y ?? 0) + (opts.gravity ?? 0);
  const drag = Math.max(0, opts.drag ?? 0);

  const fadeInFrac = clamp01(opts.fadeInFrac ?? 0.12);
  const fadeOutFrac = clamp01(opts.fadeOutFrac ?? 0.25);

  const ef = opts.edgeFadePx ?? {};
  const fL = Math.max(0, ef.left ?? 0);
  const fR = Math.max(0, ef.right ?? 0);
  const fT = Math.max(0, ef.top ?? 0);
  const fB = Math.max(0, ef.bottom ?? 0);

  const rnd = state.rnd;

  const spawn = opts.spawn ?? {};
  const sx0 = spawn.x0 ?? 0,
    sx1 = spawn.x1 ?? 1;
  const sy0 = spawn.y0 ?? 0,
    sy1 = spawn.y1 ?? 0;

  const speed = opts.speed ?? {};
  const spMin = speed.min ?? 12;
  const spMax = speed.max ?? 48;

  let angMin: number, angMax: number;
  const angleMin = opts.angle?.min;
  const angleMax = opts.angle?.max;
  if (
    (typeof angleMin === "number" && Number.isFinite(angleMin)) ||
    (typeof angleMax === "number" && Number.isFinite(angleMax))
  ) {
    angMin = typeof angleMin === "number" && Number.isFinite(angleMin) ? angleMin : 0;
    angMax = typeof angleMax === "number" && Number.isFinite(angleMax) ? angleMax : 0;
  } else {
    const dir = opts.dir ?? "none";
    const spread =
      typeof opts.spreadAngle === "number" && Number.isFinite(opts.spreadAngle)
        ? opts.spreadAngle
        : 0.35;
    const span = dirToAngleSpan(dir, spread);
    angMin = span.min;
    angMax = span.max;
  }

  const jPos = opts.jitter?.pos ?? 0;
  const jAng = opts.jitter?.velAngle ?? 0;

  const rMin = opts.size?.min ?? 1.2;
  const rMax = Math.max(rMin, opts.size?.max ?? 3.2);

  const lifeMin = Math.max(0.1, opts.lifetime?.min ?? 0.8);
  const lifeMax = Math.max(lifeMin, opts.lifetime?.max ?? 2.2);

  const sizeHz = typeof opts.sizeHz === "number" && Number.isFinite(opts.sizeHz) ? opts.sizeHz : 0;
  const wantSizeFollow = sizeHz > 0 && rMax !== rMin;

  function laneTargetSize(uSlot: number) {
    return rMin + (rMax - rMin) * uSlot;
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
  }

  for (const [i, pr] of state.particles.entries()) {
    if (pr.life <= 0) respawnParticle(pr, i, state.particles.length);
  }

  for (const [i, pr] of state.particles.entries()) {

    if (drag > 0 && dtSec > 0) {
      const k = Math.exp(-drag * dtSec);
      pr.vx *= k;
      pr.vy *= k;
    }

    pr.vx += accX * dtSec;
    pr.vy += accY * dtSec;
    pr.x += pr.vx * dtSec;
    pr.y += pr.vy * dtSec;
    pr.age += dtSec;

    if (wantSizeFollow) {
      pr.size = hzLerp(pr.size, laneTargetSize(pr.uSlot), sizeHz, dtSec);
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
  p.noStroke();

  for (const pr of state.particles) {

    let baseColor: RGBA;
    if (typeof opts.color === "function") {
      baseColor = opts.color(pr) ?? { r: 255, g: 255, b: 255, a: 255 };
    } else if (opts.color) {
      baseColor = opts.color;
    } else {
      baseColor = { r: 235, g: 240, b: 245, a: 180 };
    }

    const aBase = baseColor.a ?? 255;

    const tLife = clamp01(pr.age / pr.life);
    const fIn = fadeInFrac > 0 ? smoothstep01(tLife / Math.max(1e-6, fadeInFrac)) : 1;
    const fOut = fadeOutFrac > 0 ? smoothstep01((1 - tLife) / Math.max(1e-6, fadeOutFrac)) : 1;

    const dL = pr.x - rect.x;
    const dR = rect.x + rect.w - pr.x;
    const dT = pr.y - rect.y;
    const dB = rect.y + rect.h - pr.y;

    const eL = fL > 0 ? smoothstep01(dL / fL) : 1;
    const eR = fR > 0 ? smoothstep01(dR / fR) : 1;
    const eT = fT > 0 ? smoothstep01(dT / fT) : 1;
    const eB = fB > 0 ? smoothstep01(dB / fB) : 1;

    let alpha = aBase * fIn * fOut * eL * eR * eT * eB;
    alpha = Math.max(0, Math.min(255, alpha));

    p.fill(baseColor.r, baseColor.g, baseColor.b, alpha);
    p.circle(pr.x, pr.y, pr.size * 2);
  }

  p.pop();
}
