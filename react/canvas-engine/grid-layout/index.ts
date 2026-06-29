// src/canvas-engine/grid-layout/index.ts
// public grid-layout API for folder-level consumers.

export type { CellSize }                          from "./coords";
export {
  justifyContentForUiPlacement,
  resolveUiGridPlacement,
  uiGridPlacementToPx,
}                                                 from "./uiPlacement";
export type { UiGridPlacementInput }              from "./uiPlacement";
export {
  makeCenteredSquareGrid,
  usedRowsFromSpec,
}                                                 from "./buildGrid";
