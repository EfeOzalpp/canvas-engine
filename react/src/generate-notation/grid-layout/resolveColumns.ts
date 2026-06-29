import { resolveRows, type ResolveRowsInput, type ResolveRowsOutput } from "./resolveRows";

export interface ResolveColumnsInput extends ResolveRowsInput {
  width: number;
}

export interface ResolveColumnsOutput extends ResolveRowsOutput {
  width: number;
  topColsPerRow: number[];
  bottomColsPerRow: number[];
  // Per-column (integer) widths — non-uniform due to pixel snapping.
  topCellWidthsPerRow: number[][];
  bottomCellWidthsPerRow: number[][];
  // Center x of each column per row — derived from snapped boundaries.
  topColumnPositions: number[][];
  bottomColumnPositions: number[][];
}

function colsForRowHeight(rowHeight: number, width: number): number {
  return Math.max(1, Math.round(width / Math.max(1, rowHeight)));
}

// Cumulative snapping for columns — adjacent cells share exact integer edges.
function snappedColumns(cols: number, width: number): { widths: number[]; centers: number[] } {
  const widths: number[] = [];
  const centers: number[] = [];

  for (let c = 0; c < cols; c++) {
    const startX = Math.round((c / cols) * width);
    const endX = Math.round(((c + 1) / cols) * width);
    const w = endX - startX;
    widths.push(w);
    centers.push(startX + w / 2);
  }

  return { widths, centers };
}

export function resolveColumns(input: ResolveColumnsInput): ResolveColumnsOutput {
  const { width } = input;
  const rows = resolveRows(input);

  const topColsPerRow = rows.topRowHeights.map(h => colsForRowHeight(h, width));
  const bottomColsPerRow = rows.bottomRowHeights.map(h => colsForRowHeight(h, width));

  const topCellWidthsPerRow: number[][] = [];
  const topColumnPositions: number[][] = [];
  for (let r = 0; r < topColsPerRow.length; r++) {
    const { widths, centers } = snappedColumns(topColsPerRow[r], width);
    topCellWidthsPerRow.push(widths);
    topColumnPositions.push(centers);
  }

  const bottomCellWidthsPerRow: number[][] = [];
  const bottomColumnPositions: number[][] = [];
  for (let r = 0; r < bottomColsPerRow.length; r++) {
    const { widths, centers } = snappedColumns(bottomColsPerRow[r], width);
    bottomCellWidthsPerRow.push(widths);
    bottomColumnPositions.push(centers);
  }

  return {
    ...rows,
    width,
    topColsPerRow,
    bottomColsPerRow,
    topCellWidthsPerRow,
    bottomCellWidthsPerRow,
    topColumnPositions,
    bottomColumnPositions,
  };
}