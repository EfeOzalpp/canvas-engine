import type { CompiledHeader } from "./header.types";
import type { CompiledLayer } from "./layers.types";

export type { Vertex, CompiledRectangle } from "./geometry.types";
export type { CompiledFootprint, CompiledHeader } from "./header.types";
export type { CompiledLayer } from "./layers.types";

export interface CompiledNotation {
  id: string | undefined;
  header: CompiledHeader;
  layers: CompiledLayer[];
}
