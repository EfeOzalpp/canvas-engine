// src/canvas-engine/grid-layout/occupancy.ts

export interface Place { r0: number; c0: number; w: number; h: number }

export type CellForbidden = (r: number, c: number) => boolean;
export interface PlaceOpts {
  ignoreForbidden?: boolean;
  ignoreOccupied?: boolean;
  reserveSpace?: boolean;
}

/**
 * Tracks occupied cells for a grid and supports incremental placement of rectangular footprints.
 * A provided forbidden predicate is treated as pre-occupied space.
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

  function canPlace(r0: number, c0: number, w: number, h: number, opts: PlaceOpts = {}) {
    const {
      ignoreForbidden = false,
      ignoreOccupied = false,
    } = opts;
    if (r0 < 0 || c0 < 0 || r0 + h > rows || c0 + w > cols) return false;
    const bottomR = r0 + h - 1;
    if (colsPerRow && c0 + w > (colsPerRow[bottomR] ?? cols)) return false;
    for (let c = 0; c < w; c++) {
      const cellIdx = idx(bottomR, c0 + c);
      if (!ignoreOccupied && used[cellIdx]) return false;
      if (!ignoreForbidden && forbidden[cellIdx]) return false;
    }
    return true;
  }

  function mark(r0: number, c0: number, w: number, h: number) {
    const bottomR = r0 + h - 1;
    for (let c = 0; c < w; c++) {
      used[idx(bottomR, c0 + c)] = true;
    }
  }

  function tryPlaceAt(r0: number, c0: number, w: number, h: number, opts: PlaceOpts = {}): Place | null {
    if (!canPlace(r0, c0, w, h, opts)) return null;
    if (opts.reserveSpace !== false) {
      mark(r0, c0, w, h);
    }
    return { r0, c0, w, h };
  }

  return { canPlace, tryPlaceAt };
}
