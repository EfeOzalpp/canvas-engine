// This is the object's occupied grid rectangle after layout has placed it.

import type { GridFootprint } from "../../../shared/geometry";

export type PlacedGridRect = GridFootprint;

// Perspective only needs the row heights and fallback cell size, so keep this input small.
export interface RowHeightBucketContext {
  cell?: number;
  cellH?: number;
  rowHeights?: number[];
}

// A bucket is the depth band we use to turn grid placement into visual scaling.
export interface RowHeightBucket {
  t: number;
  bucketIndex: number;
  bucketCount: number;
  baseTileHeight: number;
  bucketHeight: number;
  buckets: number[];
}

// Rows can have different heights, so particle perspective follows visual depth instead of raw row number.
// Similar heights collapse into one bucket so tiny layout differences don't create jitter.
export function buildRowHeightBuckets(
  rowHeights: number[] | undefined,
  fallbackH: number,
  dedupeEpsilon = 0.5
): number[] {
  if (!Array.isArray(rowHeights) || rowHeights.length < 1) {
    return [fallbackH];
  }

  const sortedHeights = [...rowHeights].sort((a, b) => a - b);
  const buckets: number[] = [];

  for (const h of sortedHeights) {
    if (buckets.length === 0 || Math.abs(h - buckets[buckets.length - 1]) > dedupeEpsilon) {
      buckets.push(h);
    }
  }

  return buckets.length > 0 ? buckets : [fallbackH];
}

// Pick the closest row-height bucket and normalize its position into a 0..1 value.
export function resolveRowHeightBucketFromHeight(
  baseTileHeight: number,
  rowHeights: number[] | undefined,
  fallbackH: number,
  dedupeEpsilon = 0.5
): RowHeightBucket {
  const buckets = buildRowHeightBuckets(rowHeights, fallbackH, dedupeEpsilon);

  let bucketIndex = 0;
  let bestDist = Infinity;
  for (let i = 0; i < buckets.length; i++) {
    const d = Math.abs(baseTileHeight - buckets[i]);
    if (d < bestDist) {
      bestDist = d;
      bucketIndex = i;
    }
  }

  return {
    t: buckets.length > 1 ? bucketIndex / (buckets.length - 1) : 1,
    bucketIndex,
    bucketCount: buckets.length,
    baseTileHeight,
    bucketHeight: buckets[bucketIndex] ?? baseTileHeight,
    buckets,
  };
}

// The placed rect's bottom row is the visual anchor because that is where the object sits in the scene.
export function resolvePlacedGridBottomRowBucket(
  rect: PlacedGridRect,
  opts: RowHeightBucketContext,
  dedupeEpsilon = 0.5
): RowHeightBucket {
  const rowHeights = opts.rowHeights;
  const fallbackH = opts.cellH ?? opts.cell ?? 1;

  if (!Array.isArray(rowHeights) || rowHeights.length < 1) {
    return resolveRowHeightBucketFromHeight(fallbackH, rowHeights, fallbackH, dedupeEpsilon);
  }

  const bottomRow = Math.max(0, Math.min(rowHeights.length - 1, rect.r0 + rect.h - 1));
  const baseTileHeight = rowHeights[bottomRow];
  return resolveRowHeightBucketFromHeight(baseTileHeight, rowHeights, fallbackH, dedupeEpsilon);
}

// Shapes use this to map the bucket's 0..1 depth value into their own particle ranges.
export function mapBucketRange(t: number, min: number, max: number) {
  return min + (max - min) * t;
}
