import type { Vertex, CompiledRectangle } from "./geometry.types";

export interface CompiledLayer {
  id: string;
  name: string | undefined;
  anchorPoint: Vertex | string | undefined;
  zIndex: number | undefined;
  geometry: CompiledRectangle | undefined;
  color: string | undefined;
}
