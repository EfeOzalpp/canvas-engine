import type { Vertex } from "./geometry.types";

export function parsePointMap(value: string): Record<string, Vertex> {
  const points: Record<string, Vertex> = {};

  // Parses named local points: "y1:(0.2, 0), y2:(0.8, 0)" -> { y1: { x, y }, y2: { x, y } }.
  const pointPattern = /([a-zA-Z]\w*)\s*:\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g;

  for (const match of value.matchAll(pointPattern)) {
    points[match[1]] = {
      x: Number(match[2]),
      y: Number(match[3]),
    };
  }

  return points;
}
