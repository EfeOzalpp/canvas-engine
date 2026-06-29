export interface FrameClock {
  nowMs: number;
  deltaMs: number;
  frame: number;
}

export type FrameTick = (clock: FrameClock) => void;

interface RegisteredFrame {
  id: string;
  tick: FrameTick;
  priority: number;
  fpsCap?: number;
  lastTickMs: number | null;
}

const frames = new Map<string, RegisteredFrame>();
const preFrameHooks = new Map<string, () => void>();
const pauseReasons = new Set<string>();

// High-performance flat array cache to eliminate allocations inside runFrame
let cachedOrderedFrames: RegisteredFrame[] = [];
let isCacheDirty = false;

let rafId: number | null = null;
let lastNowMs: number | null = null;
let frame = 0;

// Rebuilds the flat layout array strictly when tracking states mutate
function rebuildFrameCache() {
  cachedOrderedFrames = Array.from(frames.values()).sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    // High-performance primitive string sorting (skips heavy localeCompare)
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  isCacheDirty = false;
}

function runFrame(nowMs: number) {
  if (pauseReasons.size > 0) {
    rafId = null;
    lastNowMs = null;
    return;
  }

  rafId = requestAnimationFrame(runFrame);
  const deltaMs = lastNowMs == null ? 1000 / 60 : Math.max(0, nowMs - lastNowMs);
  lastNowMs = nowMs;
  frame += 1;

  // Uses Map iterator directly—safely handled via modern JS optimization pipelines
  for (const hook of preFrameHooks.values()) {
    hook();
  }

  // Only allocate/sort memory if the scene graph graph actually changed
  if (isCacheDirty) {
    rebuildFrameCache();
  }

  // Pure, zero-allocation loop over a static pre-sorted array
  const len = cachedOrderedFrames.length;
  for (let i = 0; i < len; i++) {
    const entry = cachedOrderedFrames[i];
    const elapsedMs = entry.lastTickMs == null ? deltaMs : nowMs - entry.lastTickMs;

    if (entry.fpsCap && entry.fpsCap > 0 && elapsedMs < 1000 / entry.fpsCap) {
      continue;
    }

    entry.lastTickMs = nowMs;
    entry.tick({ nowMs, deltaMs: elapsedMs, frame });
  }
}

function ensureRunning() {
  if (pauseReasons.size > 0) return;
  if (rafId != null) return;
  lastNowMs = null;
  rafId = requestAnimationFrame(runFrame);
}

function stopIfIdle() {
  if (frames.size > 0 || rafId == null) return;
  cancelAnimationFrame(rafId);
  rafId = null;
  lastNowMs = null;
}

export interface RegisterCanvasFrameOptions {
  priority?: number;
  fpsCap?: number;
}

export function pauseFrameScheduler(reason: string) {
  pauseReasons.add(reason);
  if (rafId == null) return;
  cancelAnimationFrame(rafId);
  rafId = null;
  lastNowMs = null;
}

export function resumeFrameScheduler(reason: string) {
  pauseReasons.delete(reason);
  if (pauseReasons.size > 0) return;
  ensureRunning();
}

export function registerPreFrameHook(id: string, hook: () => void): () => void {
  preFrameHooks.set(id, hook);
  return () => {
    preFrameHooks.delete(id);
  };
}

export function updateCanvasFrame(
  id: string,
  options: Partial<RegisterCanvasFrameOptions>
): void {
  const entry = frames.get(id);
  if (!entry) return;

  let needsRecompile = false;
  if (options.priority !== undefined && entry.priority !== options.priority) {
    entry.priority = options.priority;
    needsRecompile = true;
  }
  if ("fpsCap" in options) {
    entry.fpsCap = options.fpsCap;
  }

  if (needsRecompile) {
    isCacheDirty = true;
  }
}

export function registerCanvasFrame(
  id: string,
  tick: FrameTick,
  options: RegisterCanvasFrameOptions = {}
): () => void {
  frames.set(id, {
    id,
    tick,
    priority: options.priority ?? 0,
    fpsCap: options.fpsCap,
    lastTickMs: null,
  });
  
  isCacheDirty = true;
  ensureRunning();
  
  return () => {
    frames.delete(id);
    isCacheDirty = true;
    stopIfIdle();
  };
}
