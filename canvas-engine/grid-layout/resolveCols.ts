// src/canvas-engine/grid-layout/resolveCols.ts

export type ResolveColsOpts = {
  rows: number;
  widthPx: number;
  heightPx: number;
  useTopRatio?: number;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function quantizeInt(n: number, step = 1) {
  const s = Math.max(1, Math.round(step));
  return Math.round(n / s) * s;
}

/**
 * Canonical column-count policy.
 * Inputs:
 * - rows (authoritative density)
 * - viewport width/height
 * - useTopRatio (if you crop height, aspect must use usableH)
 *
 * Output:
 * - integer cols (quantized)
 */
export function resolveCols(opts: ResolveColsOpts) {
  const rows = Math.max(1, Math.round(opts.rows));
  const w = Math.max(1, opts.widthPx);

  const useTop = clamp(opts.useTopRatio ?? 1, 0.01, 1);
  const usableH = Math.max(1, Math.round(opts.heightPx * useTop));

  // baseline for square-ish cells: W/cols ~= usableH/rows
  let colsF = rows * (w / usableH);

  // breakpoint tuning knobs (edit here)
  if (w < 420) colsF *= 0.95;
  else if (w < 768) colsF *= 1.0;
  else if (w < 1024) colsF *= 1.08;
  else colsF *= 1.15;

  // quantization: keep cols stable; even cols on larger screens tends to feel nicer
  const step = w >= 768 ? 2 : 1;

  // clamp relative to rows so it never explodes/collapses
  const minCols = Math.max(1, Math.floor(rows * 0.6));
  const maxCols = Math.max(minCols, Math.ceil(rows * 6.0));

  let cols = quantizeInt(colsF, step);
  cols = clamp(cols, minCols, maxCols);

  return cols;
}
