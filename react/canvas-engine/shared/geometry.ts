// Geometry primitives shared across layout, modifiers, runtime, and shapes.
// Keep them here when more than one layer needs the same shape of data.
export type Anchor =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center"
  | "top-center";

export interface GridFootprint {
  r0: number;
  c0: number;
  w: number;
  h: number;
}

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CellSize {
  cellW: number;
  cellH: number;
  ox?: number;
  oy?: number;
}
