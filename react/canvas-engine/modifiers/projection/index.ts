// Grid projection turns placement footprints into the pixels shapes draw.

import type { GridMetrics } from "../../grid-layout/gridMetrics";
import type { GridFootprint, PixelRect } from "../../shared/geometry";

export type { GridFootprint, PixelRect } from "../../shared/geometry";

export interface ProjectionContext extends Partial<GridMetrics> {
  cell?: number;
  cellW?: number;
  cellH?: number;
  pixelFootprint?: PixelRect;
}

function rowValue(values: number[] | undefined, row: number, fallback: number): number {
  return values?.[row] ?? fallback;
}

function nonZeroBase(value: number): number {
  return Math.max(1e-6, value === 0 ? 1 : value);
}

// Use the bottom row as the unit tile so multi-row shapes do not distort when
// perspective rows have different widths and heights.
export function footprintToPx(f: GridFootprint, opts: ProjectionContext): PixelRect {
  if (opts.pixelFootprint) return opts.pixelFootprint;

  const cell = opts.cell ?? 0;
  const cellW = opts.cellW ?? cell;
  const cellH = opts.cellH ?? cell;
  const bottomRow = f.r0 + f.h - 1;

  const unitW = rowValue(opts.cellWPerRow, bottomRow, cellW);
  const unitH = rowValue(opts.rowHeights, bottomRow, cellH);
  const unitOY = rowValue(opts.rowOffsetY, bottomRow, bottomRow * cellH);

  const x = f.c0 * unitW;
  const w = f.w * unitW;
  const h = f.h * unitH;
  const y = unitOY - unitH * (f.h - 1);

  return { x, y, w, h };
}

export function rowHeightAt(row: number, opts: ProjectionContext): number {
  const cellH = opts.cellH ?? opts.cell ?? 0;
  return rowValue(opts.rowHeights, row, cellH);
}

export function rowWidthAt(row: number, opts: ProjectionContext): number {
  const cellW = opts.cellW ?? opts.cell ?? 0;
  return rowValue(opts.cellWPerRow, row, cellW);
}

// Older vehicle particle code still scales from the footprint's bottom row.
// The newer particle bucket helpers live in particles/perspective.
export function particlePerspectiveScale(f: GridFootprint, opts: ProjectionContext): number {
  const cell = opts.cell ?? 0;
  const baseW = opts.cellW ?? cell;
  const baseH = opts.cellH ?? cell;
  const bottomRow = f.r0 + f.h - 1;

  const unitW = rowValue(opts.cellWPerRow, bottomRow, baseW);
  const unitH = rowValue(opts.rowHeights, bottomRow, baseH);
  const scaleW = unitW / nonZeroBase(baseW);
  const scaleH = unitH / nonZeroBase(baseH);
  const scale = Math.sqrt(Math.max(1e-6, scaleW * scaleH));

  return Math.max(0.4, Math.min(3, scale));
}

export function particleSizePerspectiveScale(f: GridFootprint, opts: ProjectionContext): number {
  const scale = particlePerspectiveScale(f, opts);
  return Math.max(0.18, Math.min(3.2, Math.pow(scale, 1.35)));
}

export function particleMotionPerspectiveScale(f: GridFootprint, opts: ProjectionContext): number {
  const scale = particlePerspectiveScale(f, opts);
  return Math.max(0.12, Math.min(3.4, Math.pow(scale, 1.75)));
}
