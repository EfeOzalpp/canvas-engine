// src/canvas-engine/grid-layout/occupancy.ts

import type { GridFootprint } from "../shared/geometry";

export type Place = GridFootprint;

type CellForbidden = (r: number, c: number) => boolean;

/**
 * Tracks the bottom row of placed footprints.
 * A multi-row footprint still controls sizing/depth elsewhere; occupation only
 * reserves the cells that touch the ground row.
 */
export function createOccupancy(rows: number, cols: number, isForbidden?: CellForbidden, colsPerRow?: number[]) {
  const forbidden = new Array(rows * cols).fill(false);
  const used = new Array(rows * cols).fill(false);
  const idx = (r: number, c: number) => r * cols + c;

  for (let r = 0; r < rows; r++) {
    const rowCols = colsPerRow ? (colsPerRow[r] ?? cols) : cols;
    for (let c = 0; c < cols; c++) {
      if (c >= rowCols || (isForbidden?.(r, c))) forbidden[idx(r, c)] = true;
    }
  }

  function canPlace(r0: number, c0: number, w: number, h: number) {
    if (r0 < 0 || c0 < 0 || r0 + h > rows || c0 + w > cols) return false;
    const bottomR = r0 + h - 1;
    if (colsPerRow && c0 + w > (colsPerRow[bottomR] ?? cols)) return false;
    for (let c = 0; c < w; c++) {
      const cellIdx = idx(bottomR, c0 + c);
      if (used[cellIdx] || forbidden[cellIdx]) return false;
    }
    return true;
  }

  function mark(r0: number, c0: number, w: number, h: number) {
    const bottomR = r0 + h - 1;
    for (let c = 0; c < w; c++) {
      used[idx(bottomR, c0 + c)] = true;
    }
  }

  function tryPlaceAt(r0: number, c0: number, w: number, h: number): Place | null {
    if (!canPlace(r0, c0, w, h)) return null;
    mark(r0, c0, w, h);
    return { r0, c0, w, h };
  }

  return { tryPlaceAt };
}
