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
 * Returns projected row depth for the bottom row of a footprint.
 *
 * Horizon grids compress distant rows and enlarge nearby rows on both sides of
 * the horizon. That means row height is a better painter-order depth than raw
 * screen Y: it works for both ground shapes and sky shapes.
 */
export function metricsDepth(
  metrics: GridMetrics,
  footprint: { r0: number; h: number }
): number {
  const bottomRow = Math.max(0, Math.min(metrics.rowHeights.length - 1, footprint.r0 + footprint.h - 1));
  return metrics.rowHeights[bottomRow] ?? 0;
}
