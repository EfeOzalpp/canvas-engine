// src/canvas-engine/grid-layout/horizonRowHeights.ts

import type { GridMetrics } from "./gridMetrics";

const MIN_WEIGHT = 0.15; // row closest to horizon (smallest)
const MAX_WEIGHT = 3.0;  // row farthest from horizon (largest)

interface HorizonRowHeightsResult extends GridMetrics {
  horizonRowH: number;
  horizonRowIdx: number;
}

// Resolves the row heights based on min-max weight clamp number of rows
// normalizes it to pixel budget (totalH) and adjusts the order of row-heights
// based on sky or ground via reversed
// is invoked by computeHorizonRowHeights. 
function perspectiveHeights(n: number, totalH: number, reversed: boolean): number[] {
  if (n === 1) return [totalH];
  const weights = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // reversed=true  (top half): MAX_WEIGHT at i=0 (top), MIN_WEIGHT at i=n-1 (horizon)
    // reversed=false (bot half): MIN_WEIGHT at i=0 (horizon), MAX_WEIGHT at i=n-1 (bottom)
    weights[i] = reversed
      ? MIN_WEIGHT + (MAX_WEIGHT - MIN_WEIGHT) * (1 - t)
      : MIN_WEIGHT + (MAX_WEIGHT - MIN_WEIGHT) * t;
  }
  const totalW = weights.reduce((a: number, b: number) => a + b, 0);
  return weights.map((wt: number) => (wt / totalW) * totalH);
}

export function computeHorizonRowHeights(
  totalH: number,
  rows: number,
  horizonPos: number,
  w: number
): HorizonRowHeightsResult {
  const n = Math.max(2, rows);
  const hp = Math.max(0.05, Math.min(0.95, horizonPos));
  const horizonY = totalH * hp;
  const topH = horizonY;
  const botH = totalH - horizonY;

  const halfRows = Math.floor(n / 2);
  const extra = n % 2;
  let topRows: number, botRows: number;
  if (extra === 0) {
    topRows = halfRows;
    botRows = halfRows;
  } else {
    // Extra row to the taller side
    if (topH >= botH) {
      topRows = halfRows + 1;
      botRows = halfRows;
    } else {
      topRows = halfRows;
      botRows = halfRows + 1;
    }
  }

  // Compute the larger side freely first, then pin the smaller side's horizon row
  // to match - so the two rows flanking the horizon have the same height.
  let topHeights: number[], botHeights: number[];

  if (topH >= botH) {
    // Top is larger: compute top freely, pin bottom's first row to top's last
    topHeights = perspectiveHeights(topRows, topH, true);
    const pinH = Math.min(topHeights[topRows - 1], botH * 0.9);
    botHeights = botRows === 1
      ? [botH]
      : [pinH, ...perspectiveHeights(botRows - 1, botH - pinH, false)];
  } else {
    // Bottom is larger: compute bottom freely, pin top's last row to bottom's first
    botHeights = perspectiveHeights(botRows, botH, false);
    const pinH = Math.min(botHeights[0], topH * 0.9);
    topHeights = topRows === 1
      ? [topH]
      : [...perspectiveHeights(topRows - 1, topH - pinH, true), pinH];
  }

  const rowHeights = [...topHeights, ...botHeights];

  const rowOffsetY = new Array<number>(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    rowOffsetY[i] = acc;
    acc += rowHeights[i];
  }

  const horizonRowIdx = topRows - 1;
  const horizonRowH = topHeights[topRows - 1]; // both flanking rows now equal

  const maxCols = Math.round(w / 8);
  const colsPerRow = rowHeights.map(rh =>
    Math.max(2, Math.min(maxCols, Math.round(w / Math.max(1, rh))))
  );
  const cellWPerRow = colsPerRow.map(c => w / c);

  return { rowHeights, rowOffsetY, horizonRowH, horizonRowIdx, colsPerRow, cellWPerRow };
}

