import { parseHeader, parseShapeId } from "./header";
import { parseLayers } from "./layers";
import type { CompiledNotation } from "./types";

export function compileNotationText(source: string): CompiledNotation {
  return {
    id: parseShapeId(source),
    header: parseHeader(source),
    layers: parseLayers(source),
  };
}
