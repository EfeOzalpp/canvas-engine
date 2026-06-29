// src/canvas-engine/runtime/render/passes/background/index.ts

// Background pass owns the static scene base: base color, gradients, and anchors.
// Animated stars are exported from the atmosphere pass.
export { createBackgroundAnchorContext } from "./anchors";
export { createBgCache } from "./cache";
