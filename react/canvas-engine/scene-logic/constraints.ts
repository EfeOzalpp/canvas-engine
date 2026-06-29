// src/canvas-engine/scene-logic/constraints.ts

import type { CanvasPaddingSpec } from '../scene-rules/canvas-padding';
import { makeCellForbidden } from '../grid-layout/forbidden';

/**
 * Combines grid spec forbidden rules into a single cell-level predicate.
 */
export function cellForbiddenFromSpec(spec: CanvasPaddingSpec, rows: number, cols: number, colsPerRow?: number[]) {
  return makeCellForbidden(spec, rows, cols, colsPerRow);
}

/**
 * Checks whether a footprint fits and its bottom row avoids forbidden cells.
 * The upper rows still affect vertical fit and projection, but no longer block
 * occupation.
 */
export function footprintAllowed(
  r0: number,
  c0: number,
  w: number,
  h: number,
  rows: number,
  cols: number,
  isForbidden: (r: number, c: number) => boolean,
  colsPerRow?: number[]
) {
  if (r0 < 0 || c0 < 0 || r0 + h > rows) return false;
  const { refRow, refCols } = horizontalReferenceForFootprint(r0, h, cols, colsPerRow);
  if (c0 + w > refCols) return false;

  for (let dc = 0; dc < w; dc++) {
    if (isForbidden(refRow, c0 + dc)) return false;
  }
  return true;
}

/**
 * Returns the row that governs horizontal placement for a footprint.
 * Horizontal fit/projection intentionally lives in the footprint's bottom-row
 * space so multi-row shapes use the same row reference as pixel sizing.
 */
export function horizontalReferenceForFootprint(
  r0: number,
  hCell: number,
  cols: number,
  colsPerRow?: number[]
): { refRow: number; refCols: number } {
  const refRow = r0 + hCell - 1;
  const refCols = colsPerRow ? (colsPerRow[refRow] ?? cols) : cols;
  return { refRow, refCols };
}

/**
 * Returns contiguous horizontal segments [cStart..cEnd] where a footprint can be placed on a row.
 * cEnd is inclusive and represents the footprint's left column.
 */
export function allowedSegmentsForRow(
  r0: number,
  wCell: number,
  hCell: number,
  rows: number,
  cols: number,
  isForbidden: (r: number, c: number) => boolean,
  colsPerRow?: number[]
): { cStart: number; cEnd: number }[] {
  const { refCols: effectiveCols } = horizontalReferenceForFootprint(r0, hCell, cols, colsPerRow);

  const segs: { cStart: number; cEnd: number }[] = [];
  let c = 0;

  while (c <= effectiveCols - wCell) {
    while (
      c <= effectiveCols - wCell &&
      !footprintAllowed(r0, c, wCell, hCell, rows, cols, isForbidden, colsPerRow)
    ) {
      c++;
    }
    if (c > effectiveCols - wCell) break;

    const cStart = c;

    while (
      c <= effectiveCols - wCell &&
      footprintAllowed(r0, c, wCell, hCell, rows, cols, isForbidden, colsPerRow)
    ) {
      c++;
    }

    const cEnd = c - 1;
    segs.push({ cStart, cEnd });
  }

  return segs;
}
