// src/canvas-engine/runtime/debug/depthMaskStats.ts

interface DepthMaskDebugStats {
  calls: number;
  skippedUnsupported: number;
  skippedAppear: number;
  skippedBlend: number;
  skippedBounds: number;
  skippedWarmupBudget: number;
  skippedTooLarge: number;
  cleared: number;
  created: number;
  baked: number;
  reused: number;
  drawn: number;
  trimmed: number;
  allocatedPixels: number;
  largestMaskPixels: number;
  lastLogMs: number;
}

interface DepthMaskDebugTracker {
  markCall(): void;
  markSkippedUnsupported(): void;
  markSkippedAppear(): void;
  markSkippedBlend(): void;
  markSkippedBounds(): void;
  markSkippedWarmupBudget(): void;
  markSkippedTooLarge(): void;
  markCleared(count: number): void;
  markCreated(maskPixels: number): void;
  markBaked(): void;
  markReused(): void;
  markTrimmed(count: number): void;
  markDrawn(): void;
  maybeLog(cacheSize: number, cachePixels: number): void;
}

function createStats(): DepthMaskDebugStats {
  return {
    calls: 0,
    skippedUnsupported: 0,
    skippedAppear: 0,
    skippedBlend: 0,
    skippedBounds: 0,
    skippedWarmupBudget: 0,
    skippedTooLarge: 0,
    cleared: 0,
    created: 0,
    baked: 0,
    reused: 0,
    drawn: 0,
    trimmed: 0,
    allocatedPixels: 0,
    largestMaskPixels: 0,
    lastLogMs: 0,
  };
}

function resetStats(stats: DepthMaskDebugStats) {
  const lastLogMs = stats.lastLogMs;
  Object.assign(stats, createStats());
  stats.lastLogMs = lastLogMs;
}

function depthMaskDebugEnabled() {
  if (typeof window === "undefined") return false;
  const debugWindow = window as Window & { __BE_DEBUG_DEPTH_MASK?: boolean };
  if (debugWindow.__BE_DEBUG_DEPTH_MASK === true) return true;

  try {
    return window.localStorage.getItem("be:debug:depth-mask") === "1";
  } catch {
    return false;
  }
}

// Console output is opt-in because this runs from the render loop.
export function createDepthMaskDebugTracker(): DepthMaskDebugTracker {
  const stats = createStats();

  return {
    markCall() {
      stats.calls += 1;
    },
    markSkippedUnsupported() {
      stats.skippedUnsupported += 1;
    },
    markSkippedAppear() {
      stats.skippedAppear += 1;
    },
    markSkippedBlend() {
      stats.skippedBlend += 1;
    },
    markSkippedBounds() {
      stats.skippedBounds += 1;
    },
    markSkippedWarmupBudget() {
      stats.skippedWarmupBudget += 1;
    },
    markSkippedTooLarge() {
      stats.skippedTooLarge += 1;
    },
    markCleared(count: number) {
      stats.cleared += count;
    },
    markCreated(maskPixels: number) {
      stats.created += 1;
      stats.allocatedPixels += maskPixels;
      stats.largestMaskPixels = Math.max(stats.largestMaskPixels, maskPixels);
    },
    markBaked() {
      stats.baked += 1;
    },
    markReused() {
      stats.reused += 1;
    },
    markTrimmed(count: number) {
      stats.trimmed += count;
    },
    markDrawn() {
      stats.drawn += 1;
    },
    maybeLog(cacheSize: number, cachePixels: number) {
      const now = performance.now();
      if (now - stats.lastLogMs < 1000) return;
      stats.lastLogMs = now;

      if (!depthMaskDebugEnabled()) {
        resetStats(stats);
        return;
      }

      console.table({
        "depth mask cache": {
          cacheSize,
          calls: stats.calls,
          drawn: stats.drawn,
          created: stats.created,
          baked: stats.baked,
          reused: stats.reused,
          trimmed: stats.trimmed,
          skippedUnsupported: stats.skippedUnsupported,
          skippedAppear: stats.skippedAppear,
          skippedBlend: stats.skippedBlend,
          skippedBounds: stats.skippedBounds,
          skippedWarmupBudget: stats.skippedWarmupBudget,
          skippedTooLarge: stats.skippedTooLarge,
          cleared: stats.cleared,
          cachePixels,
          allocatedPixels: stats.allocatedPixels,
          largestMaskPixels: stats.largestMaskPixels,
        },
      });
      resetStats(stats);
    },
  };
}
