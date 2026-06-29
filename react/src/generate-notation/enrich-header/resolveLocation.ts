import { resolveColumns, type ResolveColumnsInput } from "../grid-layout/resolveColumns";
import type { CompiledNotation } from "../../parse";
import { getPlacementConfig } from "./configs";
import type { PlacementLocation } from "./types";

export interface PlacementFrame {
  // bottom-center anchor of the shape in canvas coordinates
  x: number;
  y: number;

  cellW: number;
  cellH: number;
}

export interface LocatedShape {
  shape: CompiledNotation;
  frame: PlacementFrame;
}

function clampIndex(value: number, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  return Math.min(Math.max(0, value), maxExclusive - 1);
}

function resolveFrame(location: PlacementLocation, grid: ReturnType<typeof resolveColumns>): PlacementFrame {
  const isTop = location.band === "top";
  const rowHeights = isTop ? grid.topRowHeights : grid.bottomRowHeights;
  const rowPositions = isTop ? grid.topRowPositions : grid.bottomRowPositions;
  const cellWidths = isTop ? grid.topCellWidthsPerRow : grid.bottomCellWidthsPerRow;
  const columnPositions = isTop ? grid.topColumnPositions : grid.bottomColumnPositions;

  const row = clampIndex(location.row, rowHeights.length);
  const cols = (Array.isArray(location.col) ? location.col : [location.col])
    .map((c) => clampIndex(c, cellWidths[row]?.length ?? 0));

  const firstCol = cols[0] ?? 0;

  let cellW = 0;
  for (const c of cols) {
    cellW += cellWidths[row]?.[c] ?? 0;
  }

  const cellH = rowHeights[row] ?? 1;

  const firstColCenterX = columnPositions[row]?.[firstCol] ?? 0;
  const firstColW = cellWidths[row]?.[firstCol] ?? 0;
  const x = firstColCenterX - firstColW / 2 + cellW / 2;

  const bottomY = rowPositions[row] ?? 0;
  const y = grid.height - bottomY;

  return { x, y, cellW, cellH };
}

export function resolveLocation(
  canvasId: string,
  shapes: readonly CompiledNotation[],
  gridInput: ResolveColumnsInput,
): LocatedShape[] {
  const config = getPlacementConfig(canvasId);
  if (!config) return [];

  const grid = resolveColumns(gridInput);
  const located: LocatedShape[] = [];

  for (const shape of shapes) {
    if (!shape.id) continue;
    const location = config[shape.id];
    if (!location) continue;

    located.push({ shape, frame: resolveFrame(location, grid) });
  }

  return located;
}
