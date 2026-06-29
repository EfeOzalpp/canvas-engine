// src/canvas-engine/runtime/render/passes/light/index.ts

// Light pass owns scene light sources and scene-level overlays. Shape-local
// highlights are not drawn here; runtime passes lightCtx into shapes, and shapes
// draw their own color-mode light response from that input.
export { createRowLightCache } from "./cache";
export { createEnvironmentLightResolver } from "./environmentLight";
