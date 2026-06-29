// src/canvas-engine/scene-logic/math.ts

export const clamp01 = (v?: number) =>
  typeof v === 'number' ? Math.max(0, Math.min(1, v)) : 0.5;
