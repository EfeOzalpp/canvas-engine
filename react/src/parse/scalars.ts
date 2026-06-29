import type { Vertex } from "./geometry.types";

export function normalizeScalar(value: string): string {
  return value.trim().replace(/^"+|"+$/g, "").replace(/;$/, "").trim();
}

export function parseMaybeUndefined(value: string): string | undefined {
  const normalized = normalizeScalar(value);
  return normalized === "undefined" ? undefined : normalized;
}

export function parsePoint(value: string): Vertex | undefined {
  // Parses one local coordinate pair: "(0.2, 0)" -> { x: 0.2, y: 0 }.
  const match = normalizeScalar(value)
    .replace(/^\(|\)$/g, "")
    .match(/^([\d.]+)\s*,\s*([\d.]+)$/);
  if (!match) return undefined;

  return {
    x: Number(match[1]),
    y: Number(match[2]),
  };
}
