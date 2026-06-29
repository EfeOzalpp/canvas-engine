import { parsePointMap } from "./points";
import { normalizeScalar, parseMaybeUndefined, parsePoint } from "./scalars";
import type { CompiledLayer } from "./layers.types";

export function parseLayers(source: string): CompiledLayer[] {
  const layers: CompiledLayer[] = [];

  // Captures each layer block from "layer-1:" up to the next layer header or EOF.
  const layerPattern = /(layer-\d+)\s*:\s*([\s\S]*?)(?=\n\s*layer-\d+\s*:|$)/g;

  for (const match of source.matchAll(layerPattern)) {
    const id = match[1];
    const block = match[2];

    // Parses layer display name: "name: house-body".
    const nameMatch = block.match(/name\s*:\s*([^",;\n]+)/);

    // Parses either local anchor pairs like "anchor-point: 0.2-0" or references like "anchor-point: house-body: y2".
    const anchorMatch = block.match(/anchor-point\s*:\s*([^",;\n]+(?::\s*[^",;\n]+)?)/);

    // Parses draw order: "z-index: 1".
    const zIndexMatch = block.match(/z-index\s*:\s*(-?\d+)/);

    // Parses primitive kind: "kind: rectangle".
    const kindMatch = block.match(/kind\s*:\s*([^",;\n]+)/);

    // Parses the raw vertex list after "vertex:"; individual named pairs are parsed by parsePointMap.
    const vertexMatch = block.match(/vertex\s*:\s*([^"\n]+)/);

    // Parses CSS-style colors or token-like color values: "color: #ffffff82".
    const colorMatch = block.match(/color\s*:\s*(#[0-9a-fA-F]{3,8}|[^",;\n]+)/);
    const kind = kindMatch ? normalizeScalar(kindMatch[1]) : undefined;

    layers.push({
      id,
      name: nameMatch ? parseMaybeUndefined(nameMatch[1]) : undefined,
      anchorPoint: anchorMatch
        ? parsePoint(anchorMatch[1]) ?? normalizeScalar(anchorMatch[1])
        : undefined,
      zIndex: zIndexMatch ? Number(zIndexMatch[1]) : undefined,
      geometry: kind === "rectangle" && vertexMatch
        ? { kind: "rectangle", points: parsePointMap(vertexMatch[1]) }
        : undefined,
      color: colorMatch ? normalizeScalar(colorMatch[1]) : undefined,
    });
  }

  return layers;
}
