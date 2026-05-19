// src/canvas-engine/runtime/geometry/gridCache.ts

import type { PLike } from "../p/makeP";
import type { CanvasPaddingSpec } from "../../adjustable-rules/canvas-padding";
import { makeCenteredSquareGrid } from "../../grid-layout/buildGrid";
import type { GridMetrics } from "../../grid-layout/gridMetrics";

export type { GridMetrics };

export interface GridCacheState {
  w: number;
  h: number;
  cell: number;
  cellW: number;
  cellH: number;
  ox: number;
  oy: number;
  rows: number;
  cols: number;
  usedRows: number;
  metrics: GridMetrics;
  specKey: string | null;
}

const EMPTY_METRICS: GridMetrics = {
  rowHeights: [],
  rowOffsetY: [],
  colsPerRow: [],
  cellWPerRow: [],
};

export function createGridCache(): GridCacheState {
  return {
    w: 0,
    h: 0,
    cell: 0,
    cellW: 0,
    cellH: 0,
    ox: 0,
    oy: 0,
    rows: 0,
    cols: 0,
    usedRows: 0,
    metrics: EMPTY_METRICS,
    specKey: null,
  };
}

export function invalidateGridCache(cache: GridCacheState) {
  cache.w = 0;
  cache.h = 0;
  cache.cell = 0;
  cache.specKey = null;
}

function specKeyOf(spec: CanvasPaddingSpec) {
  return [
    String(spec.rows),
    String(spec.useTopRatio ?? 1),
    spec.horizonPos == null ? "" : String(spec.horizonPos),
  ].join("|");
}

export function computeGridCached(
  cache: GridCacheState,
  p: PLike,
  spec: CanvasPaddingSpec
): GridCacheState {
  const key = specKeyOf(spec);

  if (
    p.width === cache.w &&
    p.height === cache.h &&
    cache.specKey === key &&
    cache.cell > 0
  ) {
    return cache;
  }

  const { cell, cellW, cellH, ox, oy, rows, cols, metrics } = makeCenteredSquareGrid({
    w: p.width,
    h: p.height,
    rows: spec.rows,
    useTopRatio: spec.useTopRatio ?? 1,
    horizonPos: spec.horizonPos,
  });

  const useTop = Math.max(0.01, Math.min(1, spec.useTopRatio ?? 1));
  const usedRows = Math.max(1, Math.round(rows * useTop));

  cache.w = p.width;
  cache.h = p.height;
  cache.cell = cell;
  cache.cellW = cellW;
  cache.cellH = cellH;
  cache.ox = ox;
  cache.oy = oy;
  cache.rows = rows;
  cache.cols = cols;
  cache.usedRows = usedRows;
  cache.metrics = metrics;
  cache.specKey = key;

  return cache;
}
