// src/canvas-engine/runtime/render/passes/shared/horizon.ts

// The visual horizon is the smallest projected row. Background anchors, fog,
// and row light all use the same reference, so this helper is shared.
export function resolveHorizonRow(rowHeights: number[]): number {
  if (!Array.isArray(rowHeights) || rowHeights.length < 1) return 0;
  const minH = Math.min(...rowHeights);
  return rowHeights.indexOf(minH);
}
