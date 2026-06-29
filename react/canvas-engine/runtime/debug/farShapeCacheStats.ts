// src/canvas-engine/runtime/debug/farShapeCacheStats.ts

interface FarShapeCacheStats {
  calls: number;
  skippedDisabled: number;
  skippedPolicy: number;
  skippedNotFar: number;
  skippedBounds: number;
  skippedAppear: number;
  genericHits: number;
  genericMisses: number;
  genericBakes: number;
  genericCreated: number;
  genericDrawn: number;
  genericStaleDrawn: number;
  genericBudgetSkips: number;
  genericTooLarge: number;
  stampCandidates: number;
  stampHits: number;
  stampMisses: number;
  stampBakes: number;
  stampCreated: number;
  stampDrawn: number;
  stampStaleDrawn: number;
  stampBudgetSkips: number;
  stampTooLarge: number;
  stampMaskHits: number;
  stampMaskMisses: number;
  stampMaskBakes: number;
  stampMaskCreated: number;
  stampMaskDrawn: number;
  stampMaskStaleDrawn: number;
  stampMaskBudgetSkips: number;
  stampMaskTooLarge: number;
  trims: number;
  clears: number;
  renderTargetClears: number;
  allocatedPixels: number;
  largestEntryPixels: number;
  genericCacheSize: number;
  genericCachePixels: number;
  stampCacheSize: number;
  stampCachePixels: number;
  stampMaskCacheSize: number;
  stampMaskCachePixels: number;
  genericFallbackKeys: number;
  stampFallbackKeys: number;
  stampMaskFallbackKeys: number;
  lastUpdatedMs: number;
}

interface FarShapeCacheDebugTracker {
  markCall(): void;
  markSkippedDisabled(): void;
  markSkippedPolicy(): void;
  markSkippedNotFar(): void;
  markSkippedBounds(): void;
  markSkippedAppear(): void;
  markGenericHit(): void;
  markGenericMiss(): void;
  markGenericBake(): void;
  markGenericCreated(pixels: number): void;
  markGenericDrawn(): void;
  markGenericStaleDrawn(): void;
  markGenericBudgetSkip(): void;
  markGenericTooLarge(): void;
  markStampCandidate(): void;
  markStampHit(): void;
  markStampMiss(): void;
  markStampBake(): void;
  markStampCreated(pixels: number): void;
  markStampDrawn(): void;
  markStampStaleDrawn(): void;
  markStampBudgetSkip(): void;
  markStampTooLarge(): void;
  markStampMaskHit(): void;
  markStampMaskMiss(): void;
  markStampMaskBake(): void;
  markStampMaskCreated(pixels: number): void;
  markStampMaskDrawn(): void;
  markStampMaskStaleDrawn(): void;
  markStampMaskBudgetSkip(): void;
  markStampMaskTooLarge(): void;
  markTrimmed(count: number): void;
  markCleared(count: number): void;
  markRenderTargetCleared(count: number): void;
  updateState(state: {
    genericCacheSize: number;
    genericCachePixels: number;
    stampCacheSize: number;
    stampCachePixels: number;
    stampMaskCacheSize: number;
    stampMaskCachePixels: number;
    genericFallbackKeys: number;
    stampFallbackKeys: number;
    stampMaskFallbackKeys: number;
  }): void;
}

function createStats(): FarShapeCacheStats {
  return {
    calls: 0,
    skippedDisabled: 0,
    skippedPolicy: 0,
    skippedNotFar: 0,
    skippedBounds: 0,
    skippedAppear: 0,
    genericHits: 0,
    genericMisses: 0,
    genericBakes: 0,
    genericCreated: 0,
    genericDrawn: 0,
    genericStaleDrawn: 0,
    genericBudgetSkips: 0,
    genericTooLarge: 0,
    stampCandidates: 0,
    stampHits: 0,
    stampMisses: 0,
    stampBakes: 0,
    stampCreated: 0,
    stampDrawn: 0,
    stampStaleDrawn: 0,
    stampBudgetSkips: 0,
    stampTooLarge: 0,
    stampMaskHits: 0,
    stampMaskMisses: 0,
    stampMaskBakes: 0,
    stampMaskCreated: 0,
    stampMaskDrawn: 0,
    stampMaskStaleDrawn: 0,
    stampMaskBudgetSkips: 0,
    stampMaskTooLarge: 0,
    trims: 0,
    clears: 0,
    renderTargetClears: 0,
    allocatedPixels: 0,
    largestEntryPixels: 0,
    genericCacheSize: 0,
    genericCachePixels: 0,
    stampCacheSize: 0,
    stampCachePixels: 0,
    stampMaskCacheSize: 0,
    stampMaskCachePixels: 0,
    genericFallbackKeys: 0,
    stampFallbackKeys: 0,
    stampMaskFallbackKeys: 0,
    lastUpdatedMs: 0,
  };
}

const stats = createStats();

function touch() {
  stats.lastUpdatedMs = typeof performance !== "undefined" ? performance.now() : Date.now();
}

function addAllocatedPixels(pixels: number) {
  stats.allocatedPixels += pixels;
  stats.largestEntryPixels = Math.max(stats.largestEntryPixels, pixels);
}

function snapshot() {
  return { ...stats };
}

function reset() {
  Object.assign(stats, createStats());
  touch();
  return snapshot();
}

function installWindowHelpers() {
  if (typeof window === "undefined") return;
  const debugWindow = window as Window & {
    beCanvasCacheStats?: () => FarShapeCacheStats;
    beResetCanvasCacheStats?: () => FarShapeCacheStats;
  };
  debugWindow.beCanvasCacheStats ??= snapshot;
  debugWindow.beResetCanvasCacheStats ??= reset;
}

export function createFarShapeCacheDebugTracker(): FarShapeCacheDebugTracker {
  installWindowHelpers();

  return {
    markCall() {
      stats.calls += 1;
      touch();
    },
    markSkippedDisabled() {
      stats.skippedDisabled += 1;
    },
    markSkippedPolicy() {
      stats.skippedPolicy += 1;
    },
    markSkippedNotFar() {
      stats.skippedNotFar += 1;
    },
    markSkippedBounds() {
      stats.skippedBounds += 1;
    },
    markSkippedAppear() {
      stats.skippedAppear += 1;
    },
    markGenericHit() {
      stats.genericHits += 1;
    },
    markGenericMiss() {
      stats.genericMisses += 1;
    },
    markGenericBake() {
      stats.genericBakes += 1;
    },
    markGenericCreated(pixels: number) {
      stats.genericCreated += 1;
      addAllocatedPixels(pixels);
    },
    markGenericDrawn() {
      stats.genericDrawn += 1;
    },
    markGenericStaleDrawn() {
      stats.genericStaleDrawn += 1;
    },
    markGenericBudgetSkip() {
      stats.genericBudgetSkips += 1;
    },
    markGenericTooLarge() {
      stats.genericTooLarge += 1;
    },
    markStampCandidate() {
      stats.stampCandidates += 1;
    },
    markStampHit() {
      stats.stampHits += 1;
    },
    markStampMiss() {
      stats.stampMisses += 1;
    },
    markStampBake() {
      stats.stampBakes += 1;
    },
    markStampCreated(pixels: number) {
      stats.stampCreated += 1;
      addAllocatedPixels(pixels);
    },
    markStampDrawn() {
      stats.stampDrawn += 1;
    },
    markStampStaleDrawn() {
      stats.stampStaleDrawn += 1;
    },
    markStampBudgetSkip() {
      stats.stampBudgetSkips += 1;
    },
    markStampTooLarge() {
      stats.stampTooLarge += 1;
    },
    markStampMaskHit() {
      stats.stampMaskHits += 1;
    },
    markStampMaskMiss() {
      stats.stampMaskMisses += 1;
    },
    markStampMaskBake() {
      stats.stampMaskBakes += 1;
    },
    markStampMaskCreated(pixels: number) {
      stats.stampMaskCreated += 1;
      addAllocatedPixels(pixels);
    },
    markStampMaskDrawn() {
      stats.stampMaskDrawn += 1;
    },
    markStampMaskStaleDrawn() {
      stats.stampMaskStaleDrawn += 1;
    },
    markStampMaskBudgetSkip() {
      stats.stampMaskBudgetSkips += 1;
    },
    markStampMaskTooLarge() {
      stats.stampMaskTooLarge += 1;
    },
    markTrimmed(count: number) {
      stats.trims += count;
    },
    markCleared(count: number) {
      stats.clears += count;
    },
    markRenderTargetCleared(count: number) {
      stats.renderTargetClears += count;
    },
    updateState(state) {
      Object.assign(stats, state);
      touch();
    },
  };
}
