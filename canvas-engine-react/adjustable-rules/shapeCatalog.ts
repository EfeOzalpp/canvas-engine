// src/canvas-engine/adjustable-rules/shapeCatalog.ts

// condition ids are the stable buckets the scoring/data layer gives us.
export const CONDITION_KINDS = ['A', 'B', 'C', 'D'] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];

// shape names are the drawable assets the canvas engine can place.
export const SHAPES = [
  'clouds',
  'snow',
  'house',
  'power',
  'sun',
  'villa',
  'car',
  'sea',
  'carFactory',
  'bus',
  'trees',
] as const;

export type ShapeName = (typeof SHAPES)[number];
export type ShapeKind = ShapeName;

// reverse lookup lets render code get the condition bucket for a placed shape.
export const SHAPE_TO_COND: Record<ShapeName, ConditionKind> = {
  sun: 'A', bus: 'A', clouds: 'A',
  snow: 'B', trees: 'B', villa: 'B',
  power: 'C', house: 'C',
  sea: 'D', carFactory: 'D', car: 'D',
} as const;
