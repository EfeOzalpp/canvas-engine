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
import {
  getPuffEmitterMap,
  type ParticleStore,
} from "./store";
import {
  getLastParticles,
  isWorkerSupported,
  PARTICLE_FLOATS_PER_SLOT,
  sendP2Tick,
  warnFunctionColor,
} from "../../../workers/particles/worker-host";

export type PuffDir = "none" | "up" | "down" | "left" | "right";

export interface PuffEmitterOpts {
  store?: ParticleStore;
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
  depthAlpha?: number;

  respawn?: boolean;
  warmStartSec?: number;

  /** Offload physics to the particle web worker. color must be a static RGBA (not a function) when enabled. */
  useWorker?: boolean;
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
  warmStarted?: boolean;
}

function makeDormantParticle(uSlot: number): Particle {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    life: 0,
    size: 1,
    uSlot,
  };
}

function stratifiedSlot(index: number, total: number, rnd: RandomSource) {
  const n = Math.max(1, total);
  return (index + 0.18 + rnd() * 0.64) / n;
}

function decorrelatedSlot(uSlot: number) {
  const x = Math.sin((uSlot + 0.173) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
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

function ensureEmitter(store: ParticleStore, opts: PuffEmitterOpts): EmitterState {
  const key = opts.key;
  const emitters = getPuffEmitterMap<EmitterState>(store);
  let st = emitters.get(key);

  const wantCount = Math.max(1, Math.floor(opts.count ?? 32));
  const seed = hashPuffKey(key);

  const mk = () => {
    const rnd = makePRNG(seed);
    const particles = Array.from({ length: wantCount }, (_, i) =>
      makeDormantParticle(stratifiedSlot(i, wantCount, rnd))
    );
    return { particles, rnd };
  };

  if (!st) {
    st = mk();
    emitters.set(key, st);
  } else if (st.particles.length !== wantCount) {
    if (st.particles.length < wantCount) {
      const rnd = st.rnd;
      for (let i = st.particles.length; i < wantCount; i++) {
        st.particles.push(makeDormantParticle(stratifiedSlot(i, wantCount, rnd)));
      }
    } else {
      st.particles.length = wantCount;
    }
    for (let i = 0; i < st.particles.length; i += 1) {
      st.particles[i].uSlot = stratifiedSlot(i, wantCount, st.rnd);
    }
  }

  return st;
}

function toP2WorkerOpts(opts: PuffEmitterOpts): object {
  return {
    rect: opts.rect,
    dir: opts.dir,
    spreadAngle: opts.spreadAngle,
    angle: opts.angle,
    spawnMode: opts.spawnMode,
    respawnStratified: opts.respawnStratified,
    spawn: opts.spawn,
    speed: opts.speed,
    accel: opts.accel,
    gravity: opts.gravity,
    jitter: opts.jitter,
    drag: opts.drag,
    count: opts.count,
    size: opts.size,
    sizeHz: opts.sizeHz,
    lifetime: opts.lifetime,
    respawn: opts.respawn,
    warmStartSec: opts.warmStartSec,
  };
}

function drawP2FromBuffer(p: ParticleCanvas, opts: PuffEmitterOpts, buf: Float32Array) {
  const FPP = PARTICLE_FLOATS_PER_SLOT;
  const count = buf.length / FPP;
  const fadeInFrac = clamp01(opts.fadeInFrac ?? 0.12);
  const fadeOutFrac = clamp01(opts.fadeOutFrac ?? 0.25);
  const ef = opts.edgeFadePx ?? {};
  const fL = Math.max(0, ef.left ?? 0);
  const fR = Math.max(0, ef.right ?? 0);
  const fT = Math.max(0, ef.top ?? 0);
  const fB = Math.max(0, ef.bottom ?? 0);
  const depthAlpha = clamp01(opts.depthAlpha ?? 1);
  const rect = opts.rect;
  const baseColor: RGBA = (opts.color && typeof opts.color !== "function")
    ? opts.color
    : { r: 235, g: 240, b: 245, a: 180 };
  const aBase = baseColor.a ?? 255;

  p.push();
  p.noStroke();
  for (let i = 0; i < count; i++) {
    const b = i * FPP;
    const x = buf[b], y = buf[b + 1];
    const size = buf[b + 4], tLife = buf[b + 6];

    const fIn = fadeInFrac > 0 ? smoothstep01(tLife / Math.max(1e-6, fadeInFrac)) : 1;
    const fOut = fadeOutFrac > 0 ? smoothstep01((1 - tLife) / Math.max(1e-6, fadeOutFrac)) : 1;

    const eL = fL > 0 ? smoothstep01((x - rect.x) / fL) : 1;
    const eR = fR > 0 ? smoothstep01((rect.x + rect.w - x) / fR) : 1;
    const eT = fT > 0 ? smoothstep01((y - rect.y) / fT) : 1;
    const eB = fB > 0 ? smoothstep01((rect.y + rect.h - y) / fB) : 1;

    let alpha = aBase * fIn * fOut * eL * eR * eT * eB * depthAlpha;
    alpha = Math.max(0, Math.min(255, alpha));

    p.fill(baseColor.r, baseColor.g, baseColor.b, alpha);
    p.circle(x, y, size * 2);
  }
  p.pop();
}

export function stepAndDrawPuffs(p: ParticleCanvas, opts: PuffEmitterOpts, dtSec: number) {
  if (opts.useWorker && isWorkerSupported()) {
    if (typeof opts.color === "function") {
      warnFunctionColor(opts.key);
    } else {
      sendP2Tick(opts.key, dtSec, toP2WorkerOpts(opts));
      const buf = getLastParticles(opts.key);
      if (buf) drawP2FromBuffer(p, opts, buf);
      return;
    }
  }

  if (!opts.store) return;

  const state = ensureEmitter(opts.store, opts);
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
    return rMin + (rMax - rMin) * decorrelatedSlot(uSlot);
  }

  function advanceParticle(pr: Particle, stepSec: number) {
    if (drag > 0 && stepSec > 0) {
      const k = Math.exp(-drag * stepSec);
      pr.vx *= k;
      pr.vy *= k;
    }

    pr.vx += accX * stepSec;
    pr.vy += accY * stepSec;
    pr.x += pr.vx * stepSec;
    pr.y += pr.vy * stepSec;
    pr.age += stepSec;
  }

  function prewarmParticle(pr: Particle) {
    const travelX = Math.abs(pr.vx) > 1 ? rect.w / Math.abs(pr.vx) : Infinity;
    const travelY = Math.abs(pr.vy) > 1 ? rect.h / Math.abs(pr.vy) : Infinity;
    const travelSec = Math.min(travelX, travelY);
    const maxAge = Number.isFinite(travelSec)
      ? Math.min(pr.life * 0.85, travelSec * 0.95)
      : pr.life * 0.5;

    advanceParticle(pr, rnd() * Math.max(0, maxAge));
  }

  function respawnParticle(pr: Particle, idx: number, total: number, prewarm = false) {
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
    pr.age = 0;

    pr.size = randRange(rnd, rMin, rMax);

    if (prewarm) prewarmParticle(pr);
  }

  for (const [i, pr] of state.particles.entries()) {
    if (pr.life <= 0) respawnParticle(pr, i, state.particles.length, true);
  }

  if (!state.warmStarted) {
    state.warmStarted = true;
    const warmStartSec =
      typeof opts.warmStartSec === "number" && Number.isFinite(opts.warmStartSec)
        ? Math.max(0, opts.warmStartSec)
        : 0;
    const warmStepSec = 1 / 30;
    const warmSteps = Math.min(180, Math.ceil(warmStartSec / warmStepSec));
    for (let step = 0; step < warmSteps; step++) {
      const stepSec = Math.min(warmStepSec, warmStartSec - step * warmStepSec);
      if (stepSec <= 0) break;
      for (const [i, pr] of state.particles.entries()) {
        advanceParticle(pr, stepSec);
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
    }
  }

  for (const [i, pr] of state.particles.entries()) {

    advanceParticle(pr, dtSec);

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
  const depthAlpha = clamp01(opts.depthAlpha ?? 1);

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

    let alpha = aBase * fIn * fOut * eL * eR * eT * eB * depthAlpha;
    alpha = Math.max(0, Math.min(255, alpha));

    p.fill(baseColor.r, baseColor.g, baseColor.b, alpha);
    p.circle(pr.x, pr.y, pr.size * 2);
  }

  p.pop();
}
