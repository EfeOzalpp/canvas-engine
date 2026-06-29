import type { ResolveColumnsOutput } from "../../../../../generate-notation/grid-layout/resolveColumns";

export interface GridCacheEntry {
  result: ResolveColumnsOutput;
  specKey: string;
}

const cache = new Map<string, GridCacheEntry>();

export function getGridLayoutCache(canvasId: string): GridCacheEntry | undefined {
  return cache.get(canvasId);
}

export function setGridLayoutCache(canvasId: string, entry: GridCacheEntry): void {
  cache.set(canvasId, entry);
}

export function clearGridLayoutCache(canvasId: string): void {
  cache.delete(canvasId);
}