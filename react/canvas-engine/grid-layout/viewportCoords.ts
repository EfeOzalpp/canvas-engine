// src/canvas-engine/grid-layout/viewportCoords.ts

import type { EngineFieldItem } from "../runtime/engine/field";
import type { GridCacheState } from "../runtime/geometry/gridCache";

// Shapes that float above the city and have no depth-mask support.
// They are tested as a lower-priority fallback so a house behind a cloud wins.
const SKY_SHAPES = new Set(["clouds", "snow"]);

function testItem(
  item: EngineFieldItem,
  cssX: number,
  cssY: number,
  grid: GridCacheState,
  sampleMask?: (itemId: string, cssX: number, cssY: number) => boolean | null
): boolean {
  const fp = item.footprint;
  if (!fp) return false;

  // When a mask is cached, let it be the sole authority — it covers the full shape
  // silhouette including overhangs (e.g. a roof above the footprint rect).
  // null → no mask cached yet, fall back to the footprint rect.
  // false → transparent pixel, skip.
  // true → opaque pixel, hit.
  if (sampleMask) {
    const onPixel = sampleMask(item.id, cssX, cssY);
    if (onPixel === true) return true;
    if (onPixel === false) return false;
    // null: mask not cached yet — fall through to rect check
  }

  let px: { x: number; y: number; w: number; h: number };
  if (item.pixelFootprint) {
    px = item.pixelFootprint;
  } else {
    const { rowOffsetY, rowHeights, cellWPerRow } = grid.metrics;
    const topRow = Math.max(0, Math.min(rowOffsetY.length - 1, fp.r0));
    const bottomRow = Math.max(0, Math.min(rowHeights.length - 1, fp.r0 + fp.h - 1));
    const y = grid.oy + (rowOffsetY[topRow] ?? fp.r0 * grid.cellH);
    const rowBottomY = grid.oy + (rowOffsetY[bottomRow] ?? bottomRow * grid.cellH) + (rowHeights[bottomRow] ?? grid.cellH);
    const cw = cellWPerRow[bottomRow] ?? grid.cellW;
    const w = Math.max(1, fp.w * cw);
    px = { x: item.x - w / 2, y, w, h: Math.max(1, rowBottomY - y) };
  }

  return !(cssX < px.x || cssX >= px.x + px.w || cssY < px.y || cssY >= px.y + px.h);
}

// items must be in render order (first = farthest/bottom, last = closest/top).
// Ground shapes always win over sky shapes regardless of draw order.
// Within each tier, the last hit in render order wins (drawn on top).
export function hitTestFieldItem(
  cssX: number,
  cssY: number,
  items: EngineFieldItem[],
  grid: GridCacheState,
  sampleMask?: (itemId: string, cssX: number, cssY: number) => boolean | null
): EngineFieldItem | null {
  let best: EngineFieldItem | null = null;

  // Pass 1: ground shapes
  for (const item of items) {
    if (SKY_SHAPES.has(item.shape)) continue;
    if (testItem(item, cssX, cssY, grid, sampleMask)) best = item;
  }
  if (best !== null) return best;

  // Pass 2: sky shapes (only if nothing on the ground was hit)
  for (const item of items) {
    if (!SKY_SHAPES.has(item.shape)) continue;
    if (testItem(item, cssX, cssY, grid, sampleMask)) best = item;
  }
  return best;
}
