// src/canvas-engine/runtime/render/ghosts.ts

import type { EngineFieldItem } from "../engine/field";
import type { RuntimeShapeOptions } from "../shapes/types";
import { clamp01, easeOutCubic } from "../util/easing";

export interface Ghost {
  dieAtMs: number;
  x: number;
  y: number;
  shape: string;
  footprint?: EngineFieldItem["footprint"];
}

export function drawGhosts(params: {
  nowMs: number;
  ghosts: Ghost[];
  exitMs: number;
  baseShared: RuntimeShapeOptions;
  perShapeScale: Record<string, number> | undefined;
  baseR: number;
  renderOne: (it: EngineFieldItem, rEff: number, shared: RuntimeShapeOptions, rootAppearK: number) => void;
}): Ghost[] {
  const {
    nowMs,
    ghosts,
    exitMs,
    baseShared,
    perShapeScale,
    baseR,
    renderOne,
  } = params;

  if (!exitMs || exitMs <= 0) return [];
  if (!ghosts.length) return ghosts;

  const next: Ghost[] = [];
  for (const g of ghosts) {
    const dt = nowMs - g.dieAtMs;
    if (dt >= exitMs) continue;

    const k = 1 - easeOutCubic(clamp01(dt / exitMs));

    const it: EngineFieldItem = {
      id: "__ghost__",
      x: g.x,
      y: g.y,
      shape: g.shape,
      footprint: g.footprint,
    };

    const scale = perShapeScale?.[it.shape] ?? 1;
    const rEff = baseR * scale;
    const shared: RuntimeShapeOptions = { ...baseShared, footprint: g.footprint, alpha: Math.round(235 * k) };

    renderOne(it, rEff, shared, k);
    next.push(g);
  }

  return next;
}
