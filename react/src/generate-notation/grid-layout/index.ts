import type { GridConfig } from "./fallback";

export type { GridConfig };
export { fallback as gridFallback } from "./fallback";
export { drawGridOverlay } from "./grid-draw/gridOverlay";

// Returns the horizon as a top-down percentage (0..100) from the grid's bottom-up config.
export function resolveHorizon(config: GridConfig): number {
  return (1 - config.horizon) * 100;
}

import "./configs";