// src/canvas-engine/grid-layout/gridMetrics.ts
//
// GridMetrics bundles the four per-row variable arrays that are derived from
// a horizonPos layout.  Passing this single object through the pipeline avoids
// threading four separate arrays everywhere.

export interface GridMetrics {
  rowHeights: number[];
  rowOffsetY: number[];
  colsPerRow: number[];
  cellWPerRow: number[];
}

/**
 * Returns the pixel Y offset of the bottom row of a footprint.
 * Monotonically increasing for all rows (both above and below horizon),
 * so shapes higher on screen always render before (behind) shapes lower on screen.
 */
export function metricsDepth(
  metrics: GridMetrics,
  footprint: { r0: number; h: number }
): number {
  const bottomRow = footprint.r0 + footprint.h - 1;
  return metrics.rowOffsetY[bottomRow] ?? 0;
}
