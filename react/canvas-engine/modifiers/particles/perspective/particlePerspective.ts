import {
  mapBucketRange,
  resolvePlacedGridBottomRowBucket,
  type PlacedGridRect,
  type RowHeightBucket,
  type RowHeightBucketContext,
} from "./rowHeightBuckets";
import { clamp01 } from "../utils";

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

// Particle depth is alpha-only. Far particles keep their authored color, but
// fade back so light-mode snow/rain does not gain contrast by getting darker.
export function particleDepthAlpha(
  bucketOrT: ParticleRowBucket | number | undefined,
  minAlpha = 0.55
): number {
  const t = typeof bucketOrT === "number" ? bucketOrT : bucketOrT?.t ?? 1;
  const farK = 1 - clamp01(t);
  return 1 - Math.pow(farK, 0.9) * (1 - clamp01(minAlpha));
}

// Size perspective is intentionally stronger than alpha. Far particles shrink
// so they stop competing with foreground shapes; near particles get a slight lift.
export function particleDepthSizeScale(
  bucketOrT: ParticleRowBucket | number | undefined,
  farScale = 0.72,
  nearScale = 1.16
): number {
  const t = typeof bucketOrT === "number" ? bucketOrT : bucketOrT?.t ?? 1;
  const shapedT = Math.pow(clamp01(t), 0.9);
  return farScale + (nearScale - farScale) * shapedT;
}
