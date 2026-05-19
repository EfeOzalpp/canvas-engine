// src/canvas-engine/adjustable-rules/placement-rules/helpers.ts

import type { ShapeName } from "../shapeCatalog";
import { SHAPES } from "../shapeCatalog";
import type { QuotaAnchor, ScenePlacementRules, ShapePlacementRule } from "./types";

// apply the same rule to multiple shapes, then spread the result into a rules object.
export function forShapes(
  shapes: ShapeName[],
  rule: ShapePlacementRule
): ScenePlacementRules {
  const out: ScenePlacementRules = {};
  for (const s of shapes) out[s] = rule;
  return out;
}

// stable ids let runtime track appear/exit animations as counts grow or shrink.
const SHAPE_IDX: Record<string, number> = Object.fromEntries(
  SHAPES.map((s, i) => [s, i])
);

export function stableItemId(shape: ShapeName, zoneIdx: number, itemIdx: number): string {
  // keep the old numeric encoding, but runtime tracks items by string id.
  const encodedId = (SHAPE_IDX[shape] * 65536 + zoneIdx * 256 + itemIdx) | 0;
  return String(encodedId);
}

// interpolate the authored quota curve at allocAvg t.
export function interpolatePct(quota: QuotaAnchor[] | undefined, t: number): number {
  if (!quota || quota.length === 0) return 50;

  const sorted = [...quota].sort((a, b) => a.t - b.t);
  const clamped = Math.max(0, Math.min(1, t));

  if (clamped <= sorted[0].t) return sorted[0].pct;
  if (clamped >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].pct;

  let i = 0;
  while (i < sorted.length - 1 && clamped > sorted[i + 1].t) i++;

  const a = sorted[i];
  const b = sorted[i + 1];
  const k = (clamped - a.t) / Math.max(1e-6, b.t - a.t);
  return a.pct + (b.pct - a.pct) * k;
}
