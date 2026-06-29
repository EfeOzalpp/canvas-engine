// src/canvas-engine/grid-layout/buildGrid.ts

import { resolveCols } from "./resolveCols";
import { computeHorizonRowHeights } from "./horizonRowHeights";
import type { GridMetrics } from "./gridMetrics";

interface Pt { x: number; y: number }
interface MakeCenteredGridOpts {
  w: number;
  h: number;
  rows: number;
  useTopRatio?: number;
  horizonPos?: number; // 0..1 fraction of height where the horizon sits
}
// w: available horizontal space
// h: total vertical space
// rows: authoritative vertical density
// useTopRatio: vertical cropping (top portion only)
// horizonPos: 0..1 fraction - rows split at this height, each half compressed toward horizon

export function makeCenteredSquareGrid(opts: MakeCenteredGridOpts) {
  const { w, h, rows, useTopRatio = 1, horizonPos } = opts;

  const usableH = Math.max(1, Math.round(h * Math.max(0.01, Math.min(1, useTopRatio))));

  const ox = 0;
  const oy = 0;

  if (horizonPos != null) {
    const { rowHeights, rowOffsetY, horizonRowH, horizonRowIdx, colsPerRow, cellWPerRow } =
      computeHorizonRowHeights(usableH, rows, horizonPos, w);

    const cols = Math.max(...colsPerRow); // max for occupancy grid stride
    const cellW = cellWPerRow[Math.min(cellWPerRow.length - 1, horizonRowIdx)];
    const cellH = horizonRowH;
    const cell = horizonRowH;

    const points: Pt[] = [];
    for (let r = 0; r < rows; r++) {
      const cy = oy + rowOffsetY[r] + rowHeights[r] / 2;
      const rCols = colsPerRow[r];
      const rCellW = cellWPerRow[r];
      for (let c = 0; c < rCols; c++) {
        const cx = ox + c * rCellW + rCellW / 2;
        points.push({ x: Math.round(cx), y: Math.round(cy) });
      }
    }

    const metrics: GridMetrics = { rowHeights, rowOffsetY, colsPerRow, cellWPerRow };
    return { points, rows, cols, cell, cellW, cellH, ox, oy, metrics };
  }

  // Uniform rows (no horizon)
  const cellH = usableH / Math.max(1, rows);
  const cols = resolveCols({ rows, widthPx: w, heightPx: h, useTopRatio });
  const cellW = w / cols;
  const cell = cellH;

  const rowHeights = Array.from({ length: rows }, () => cellH);
  const rowOffsetY = Array.from({ length: rows }, (_, i) => i * cellH);
  const colsPerRow = Array.from({ length: rows }, () => cols);
  const cellWPerRow = Array.from({ length: rows }, () => cellW);

  const points: Pt[] = [];
  for (let r = 0; r < rows; r++) {
    const cy = oy + r * cellH + cellH / 2;
    for (let c = 0; c < cols; c++) {
      const cx = ox + c * cellW + cellW / 2;
      points.push({ x: Math.round(cx), y: Math.round(cy) });
    }
  }

  const metrics: GridMetrics = { rowHeights, rowOffsetY, colsPerRow, cellWPerRow };
  return { points, rows, cols, cell, cellW, cellH, ox, oy, metrics };
}


/**
 * Converts avg in [0..1] to a row-major index into a flattened list of total length.
 */
export function indexFromAvg(avg: number, total: number) {
  const t = Number.isFinite(avg) ? Math.max(0, Math.min(1, avg)) : 0.5;
  return Math.min(total - 1, Math.max(0, Math.round(t * (total - 1))));
}

/**
 * Computes how many rows are considered within the "used" region.
 * This mirrors the way makeCenteredSquareGrid derives usable height.
 */
export function usedRowsFromSpec(rows: number, useTopRatio?: number) {
  const useTop = Math.max(0.01, Math.min(1, useTopRatio ?? 1));
  return Math.max(1, Math.round(rows * useTop));
}
