import {
  mapBucketRange,
  resolvePlacedGridBottomRowBucket,
  type PlacedGridRect,
  type RowHeightBucket,
  type RowHeightBucketContext,
} from "./rowHeightBuckets";

// Public particle perspective type. The row-height details stay behind this modifier boundary.
export type ParticleRowBucket = RowHeightBucket;

// Shapes can ask for perspective by placed grid rect without knowing how the row buckets work.
export function particleRowBucket(
  rect: PlacedGridRect,
  opts: RowHeightBucketContext,
  dedupeEpsilon = 0.5
): ParticleRowBucket {
  return resolvePlacedGridBottomRowBucket(rect, opts, dedupeEpsilon);
}

// Keep the range mapper beside particle perspective so shapes don't import row-height internals.
export const particleBucketRange = mapBucketRange;
