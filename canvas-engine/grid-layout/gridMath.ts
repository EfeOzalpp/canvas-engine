export type ColsFromRowsOpts = {
  rows: number;
  usableW: number;
  usableH: number;
  minCols?: number;
  maxCols?: number;
};

export function colsFromRowsSquareish(opts: ColsFromRowsOpts) {
  const rows = Math.max(1, Math.round(opts.rows));
  const usableW = Math.max(1, opts.usableW);
  const usableH = Math.max(1, opts.usableH);

  // make cellW ~= cellH  => cols ~= rows * (W/H)
  const target = rows * (usableW / usableH);

  const minCols = Math.max(1, Math.round(opts.minCols ?? 1));
  const maxCols = Math.max(minCols, Math.round(opts.maxCols ?? rows * 6)); // tune cap

  const cols = Math.max(minCols, Math.min(maxCols, Math.round(target)));
  return cols;
}
