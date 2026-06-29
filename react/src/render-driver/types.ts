import type { RenderApi } from "../render-api";
import type { LocatedShape } from "../generate-notation/enrich-header";

export interface Vertex {
  x: number;
  y: number;
}

export interface ShapeKinds {
  rectangle: {
    points: Record<string, Vertex>;
  };
}

export type ShapeKind = keyof ShapeKinds;

export interface RenderDriverInput {
  api: RenderApi;
  shapes: readonly LocatedShape[];
}
