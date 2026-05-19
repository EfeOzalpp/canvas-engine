// src/canvas-engine/adjustable-rules/conditionFootprints.ts

import type { ConditionKind, ShapeKind } from "./shapeCatalog";
import { CONDITION_KINDS, SHAPES } from "./shapeCatalog";

// re-export the catalog pieces this file builds on.
export { CONDITION_KINDS, SHAPES };
export type { ConditionKind };

// footprint size is how many grid cells a shape reserves.
export interface Size {
  w: number;
  h: number;
}

// a variant connects one drawable shape to the footprint it needs.
export interface Variant {
  shape: ShapeKind;
  footprint: Size;
}

// each condition owns the shape variants that can represent it in the scene.
export interface ConditionSpec {
  variants: readonly Variant[];
}

// condition -> possible visual shapes.
// this is the authored source of truth for which shapes belong to A/B/C/D.
export const CONDITIONS: Record<ConditionKind, ConditionSpec> = {
  A: {
    variants: [
      { shape: "clouds", footprint: { w: 2, h: 3 } },
      { shape: "sun", footprint: { w: 2, h: 2 } },
      { shape: "bus", footprint: { w: 2, h: 1 } },
    ],
  },
  B: {
    variants: [
      { shape: "snow", footprint: { w: 1, h: 3 } },
      { shape: "villa", footprint: { w: 2, h: 2 } },
      { shape: "trees", footprint: { w: 1, h: 1 } },
    ],
  },
  C: {
    variants: [
      { shape: "house", footprint: { w: 1, h: 3 } },
      { shape: "power", footprint: { w: 1, h: 3 } },
    ],
  },
  D: {
    variants: [
      { shape: "car", footprint: { w: 1, h: 1 } },
      { shape: "sea", footprint: { w: 2, h: 1 } },
      { shape: "carFactory", footprint: { w: 2, h: 2 } },
    ],
  },
} as const;

// flat lookup from shape name to footprint size.
export function footprintForShape(shape: ShapeKind): Size {
  for (const kind of CONDITION_KINDS) {
    const hit = CONDITIONS[kind].variants.find((v) => v.shape === shape);
    if (hit) return hit.footprint;
  }
  return { w: 1, h: 1 };
}
