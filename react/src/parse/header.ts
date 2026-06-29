import { normalizeScalar, parseMaybeUndefined } from "./scalars";
import type { CompiledHeader } from "./header.types";

export function parseShapeId(source: string): string | undefined {
  // Parses the shape header form: "shape-1:".
  const idMatch = source.match(/^\s*([a-zA-Z]\w*(?:-\w+)*)\s*:/m);

  return idMatch ? normalizeScalar(idMatch[1]) : undefined;
}

export function parseHeader(source: string): CompiledHeader {
  // Parses header name values, including "name: undefined".
  const nameMatch = source.match(/name\s*:\s*([^",;\n]+)/);

  // Parses column span from: "foot-print: x: 2".
  const footprintMatch = source.match(/foot-print\s*:\s*x\s*:\s*([\d.]+)/);

  return {
    name: nameMatch ? parseMaybeUndefined(nameMatch[1]) : undefined,
    footprint: footprintMatch ? { x: Number(footprintMatch[1]) } : undefined,
  };
}
