import type { Tile } from "./tile";

export type { Tile };

export interface OccupancyGrid {
  canPlace: (tile: Tile) => boolean;
  mark: (tile: Tile) => void;
  tryPlace: (tile: Tile) => boolean;
  isUsed: (tile: Tile) => boolean;
}

export function createOccupancy(colsPerRow: number[]): OccupancyGrid {
  const used = new Set<string>();

  function key(tile: Tile): string {
    return `${tile.row}:${tile.col}`;
  }

  function isValid(tile: Tile): boolean {
    const maxCols = colsPerRow[tile.row];
    return (
      tile.row >= 0 &&
      tile.row < colsPerRow.length &&
      tile.col >= 0 &&
      tile.col < maxCols
    );
  }

  function canPlace(tile: Tile): boolean {
    return isValid(tile) && !used.has(key(tile));
  }

  function mark(tile: Tile): void {
    used.add(key(tile));
  }

  function tryPlace(tile: Tile): boolean {
    if (!canPlace(tile)) return false;
    mark(tile);
    return true;
  }

  function isUsed(tile: Tile): boolean {
    return used.has(key(tile));
  }

  return { canPlace, mark, tryPlace, isUsed };
}
