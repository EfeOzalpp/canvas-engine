// src/canvas-engine/scene-rules/shapeFootprints.ts

import type { ShapeName } from "./shapeCatalog";

// Footprint size is how many grid cells a shape reserves.
export interface Size {
  w: number;
  h: number;
}

// Authored source of truth for shape footprint sizes.
export const SHAPE_FOOTPRINTS = {
  clouds: { w: 2, h: 3 },
  snow: { w: 1, h: 3 },
  house: { w: 1, h: 4 },
  power: { w: 1, h: 3 },
  sun: { w: 2, h: 2 },
  villa: { w: 2, h: 2 },
  car: { w: 1, h: 1 },
  sea: { w: 2, h: 1 },
  carFactory: { w: 2, h: 2 },
  bus: { w: 2, h: 1 },
  trees: { w: 1, h: 1 },
} satisfies Record<ShapeName, Size>;

export function footprintForShape(shape: ShapeName): Size {
  return SHAPE_FOOTPRINTS[shape];
}
