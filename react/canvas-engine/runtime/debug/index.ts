// src/canvas-engine/runtime/debug/index.ts

export { createDepthMaskDebugTracker } from "./depthMaskStats";
export { reportSchedulerTickError, warnUnknownShape } from "./diagnostics";
export { createFarShapeCacheDebugTracker } from "./farShapeCacheStats";
export { DEBUG_DEFAULT } from "./flags";
export type { DebugFlags } from "./flags";
export { drawGridOverlay } from "./gridOverlay";
