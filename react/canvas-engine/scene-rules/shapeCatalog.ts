// src/canvas-engine/scene-rules/shapeCatalog.ts

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
