import type { PlacementFrame } from "../generate-notation/enrich-header";

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface ScalarNormalizer {
  point: (x: number, y: number) => NormalizedPoint;
}

export function createScalarNormalizer(frame: PlacementFrame): ScalarNormalizer {
  const { cellW, cellH } = frame;

  return {
    point(x: number, y: number): NormalizedPoint {
      return {
        x: Math.max(0, x) * cellW,
        y: Math.max(0, y) * cellH,
      };
    },
  };
}
