// src/canvas-engine/adjustable-rules/canvas-padding/types.ts

export interface CanvasPaddingSpec {
  rows: number;
  useTopRatio?: number;
  horizonPos?: number;
  forbidden?: (r: number, c: number, rows: number, cols: number) => boolean;
}

export type ScenePaddingByDevice = Record<string, CanvasPaddingSpec | null>;
