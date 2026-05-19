// src/canvas-engine/grid-layout/index.ts
// public grid-layout API. The groups show dependency direction at a glance.

// pure types and math
export type { GridMetrics }                       from "./gridMetrics";
export { metricsDepth }                           from "./gridMetrics";
export { computeHorizonRowHeights }               from "./horizonRowHeights";
export { resolveCols }                            from "./resolveCols";
export type { ResolveColsOpts }                   from "./resolveCols";

// grid primitives
export { cellAnchorToPx2, cellRectToPx2 }         from "./coords";
export type { CellSize }                          from "./coords";
export {
  justifyContentForUiPlacement,
  resolveUiGridBandPlacement,
  resolveUiGridPlacement,
  uiGridPlacementToPx,
  uiGridRectToPx,
}                                                 from "./uiPlacement";
export type { Footprint, PlaceOpts }              from "./footprint";
export type {
  UiGridBandPlacement,
  UiGridPlacement,
  UiGridPlacementInput,
  UiGridPlacementPx,
  UiGridRect,
  UiGridResolver,
}                                                 from "./uiPlacement";
export {
  rectFromFootprint,
  pointInFootprint,
}                                                 from "./footprint";
export { createOccupancy }                        from "./occupancy";
export type { Place, CellForbidden }              from "./occupancy";
export {
  makeRowForbidden,
  makeCellForbidden,
  rectFracToCellRange,
  cellInRectFrac,
}                                                 from "./forbidden";
export type { GridRectFrac, ForbiddenSpec, CellRC, RowRule } from "./forbidden";

// grid assembly
export {
  makeCenteredSquareGrid,
  indexFromAvg,
  usedRowsFromSpec,
}                                                 from "./buildGrid";
export type { MakeCenteredGridOpts, Pt }          from "./buildGrid";
