// src/canvas-engine/runtime/engine/scheduler.ts

export type EngineTick = (now: number) => void;

interface FrameEntry {
  id: string;
  tick: EngineTick;
  priority: number;
  fpsCap?: number;
  lastTickMs: number;
}

export interface RegisterFrameOpts {
  priority?: number; // higher draws earlier (you can invert if you want)
  fpsCap?: number;   // optional, e.g. 30
}

const entries = new Map<string, FrameEntry>();

let rafId: number | null = null;
let sortedCache: FrameEntry[] | null = null;

function sortEntries() {
  sortedCache ??= Array.from(entries.values()).sort(
    (a, b) => (b.priority - a.priority) || a.id.localeCompare(b.id)
  );
  return sortedCache;
}

function ensureRunning() {
  if (rafId != null) return;
  rafId = requestAnimationFrame(frame);
}

function stopIfIdle() {
  if (entries.size > 0) return;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// Pause all ticks when the tab is hidden - resume automatically on visibility.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && rafId == null && entries.size > 0) {
      ensureRunning();
    }
  });
}

function frame(now: number) {
  // Skip rendering while tab is hidden but keep the loop alive so it
  // resumes immediately when the user returns.
  if (typeof document !== "undefined" && document.hidden) {
    rafId = requestAnimationFrame(frame);
    return;
  }

  rafId = requestAnimationFrame(frame);

  const list = sortEntries();

  for (const e of list) {
    if (e.fpsCap && e.fpsCap > 0) {
      const minDt = 1000 / e.fpsCap;
      if (now - e.lastTickMs < minDt) continue;
    }

    e.lastTickMs = now;
    try {
      e.tick(now);
    } catch (err) {
      // Don't kill the scheduler because one engine threw.
       
      console.error(`[engine scheduler] tick failed for "${e.id}"`, err);
    }
  }

  // If everything was unregistered during ticks, shut down.
  stopIfIdle();
}

export function registerEngineFrame(
  id: string,
  tick: EngineTick,
  opts: RegisterFrameOpts = {}
) {
  const priority = typeof opts.priority === "number" && Number.isFinite(opts.priority) ? opts.priority : 0;
  const fpsCap = typeof opts.fpsCap === "number" && Number.isFinite(opts.fpsCap) ? opts.fpsCap : undefined;

  entries.set(id, {
    id,
    tick,
    priority,
    fpsCap,
    lastTickMs: 0,
  });

  sortedCache = null;
  ensureRunning();
}

export function unregisterEngineFrame(id: string) {
  entries.delete(id);
  sortedCache = null;
  stopIfIdle();
}
