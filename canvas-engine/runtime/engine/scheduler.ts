// src/canvas-engine/runtime/engine/scheduler.ts

import type { Entry } from "../types.ts";

export type EngineTick = (now: number) => void;

export type RegisterFrameOpts = {
  priority?: number; // higher draws earlier (you can invert if you want)
  fpsCap?: number;   // optional, e.g. 30
};

const entries = new Map<string, Entry>();

let rafId: number | null = null;
let sortedCache: Entry[] | null = null;

function sortEntries() {
  if (!sortedCache) {
    sortedCache = Array.from(entries.values()).sort(
      (a, b) => (b.priority - a.priority) || a.id.localeCompare(b.id)
    );
  }
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

function frame(now: number) {
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
      // Don’t kill the scheduler because one engine threw.
      // You can add a warnOnce here if you want.
      // eslint-disable-next-line no-console
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
  const priority = Number.isFinite(opts.priority) ? (opts.priority as number) : 0;
  const fpsCap = Number.isFinite(opts.fpsCap) ? (opts.fpsCap as number) : undefined;

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
