// src/canvas-engine/grid-layout/uiPlacement.ts

import { cellAnchorToPx2, cellRectToPx2 } from "./coords";
import type { CellSize } from "./coords";

interface UiGridRect {
  r0: number;
  c0: number;
  w: number;
  h: number;
}

type UiGridPlacement = UiGridRect & {
  anchor?: "topleft" | "center";
};

interface UiGridBandPlacement {
  verticalK: [top: number, bottom: number];
  horizontalK?: [left: number, right: number];
  w: number;
  h: number;
  anchor?: "topleft" | "center";
  rowAlign?: "start" | "center" | "end";
  colAlign?: "start" | "center" | "end";
}

export type UiGridPlacementInput = UiGridPlacement | UiGridBandPlacement;

interface UiGridResolver {
  rows: number;
  cols: number;
  usedRows?: number;
  colsPerRow?: number[];
}

interface UiGridPlacementPx {
  left: number;
  top: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

function clampInt(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

function alignIndex(
  min: number,
  max: number,
  align: "start" | "center" | "end" = "center"
) {
  if (max <= min) return min;
  if (align === "start") return min;
  if (align === "end") return max;
  return Math.round((min + max) / 2);
}

function horizontalReferenceForFootprint(
  rows: number,
  cols: number,
  r0: number,
  h: number,
  colsPerRow?: number[]
) {
  const bottomRow = clampInt(r0 + h - 1, 0, Math.max(0, rows - 1));
  return colsPerRow?.[bottomRow] ?? cols;
}

export function resolveUiGridBandPlacement(
  grid: UiGridResolver,
  placement: UiGridBandPlacement
): UiGridPlacement {
  const usedRows = Math.max(1, Math.min(grid.rows, grid.usedRows ?? grid.rows));
  const maxRowStart = Math.max(0, Math.min(grid.rows, usedRows) - placement.h);
  const topK = Math.max(0, Math.min(1, placement.verticalK[0]));
  const bottomK = Math.max(topK, Math.min(1, placement.verticalK[1]));
  const rMin = clampInt(Math.floor(usedRows * topK), 0, maxRowStart);
  const rMax = clampInt(Math.floor(usedRows * bottomK), rMin, maxRowStart);
  const r0 = alignIndex(rMin, rMax, placement.rowAlign);

  const refCols = horizontalReferenceForFootprint(
    grid.rows,
    grid.cols,
    r0,
    placement.h,
    grid.colsPerRow
  );
  const maxColStart = Math.max(0, refCols - placement.w - 1);
  const leftK = Math.max(0, Math.min(1, placement.horizontalK?.[0] ?? 0));
  const rightK = Math.max(leftK, Math.min(1, placement.horizontalK?.[1] ?? 1));
  const cMin = clampInt(Math.floor(refCols * leftK), 0, maxColStart);
  const cMax = clampInt(Math.floor(refCols * rightK), cMin, maxColStart);
  const c0 = alignIndex(cMin, cMax, placement.colAlign);

  return {
    r0,
    c0,
    w: placement.w,
    h: placement.h,
    anchor: placement.anchor,
  };
}

export function justifyContentForUiPlacement(
  placement: UiGridPlacementInput
): "flex-start" | "center" | "flex-end" {
  if ("colAlign" in placement && placement.colAlign) {
    if (placement.colAlign === "start") return "flex-start";
    if (placement.colAlign === "end") return "flex-end";
  }

  if ("horizontalK" in placement && placement.horizontalK) {
    const mid = (placement.horizontalK[0] + placement.horizontalK[1]) * 0.5;
    if (mid <= 0.34) return "flex-start";
    if (mid >= 0.66) return "flex-end";
  }

  return "center";
}

export function resolveUiGridPlacement(
  grid: UiGridResolver,
  placement: UiGridPlacementInput
): UiGridPlacement {
  if ("r0" in placement) return placement;
  return resolveUiGridBandPlacement(grid, placement);
}

export function uiGridRectToPx(size: CellSize, rect: UiGridRect): UiGridPlacementPx {
  if (size.cellWPerRow && size.rowHeights && size.rowOffsetY) {
    const bottomRow = clampInt(
      rect.r0 + rect.h - 1,
      0,
      Math.max(0, size.rowHeights.length - 1)
    );
    const unitW = size.cellWPerRow[bottomRow] ?? size.cellW;
    const unitH = size.rowHeights[bottomRow] ?? size.cellH;
    const topLeft = cellAnchorToPx2(size, rect, "topleft");
    const pxH = unitH * rect.h;

    return {
      left: topLeft.x,
      top: topLeft.y,
      width: rect.w * unitW,
      height: pxH,
      anchorX: topLeft.x + (rect.w * unitW) / 2,
      anchorY: topLeft.y + pxH / 2,
    };
  }

  const pxRect = cellRectToPx2(size, rect.r0, rect.c0, rect.w, rect.h);
  const anchor = cellAnchorToPx2(size, rect, "center");

  return {
    left: pxRect.x,
    top: pxRect.y,
    width: pxRect.w,
    height: pxRect.h,
    anchorX: anchor.x,
    anchorY: anchor.y,
  };
}

export function uiGridPlacementToPx(
  size: CellSize,
  placement: UiGridPlacement
): UiGridPlacementPx {
  const pxRect = uiGridRectToPx(size, placement);

  if (placement.anchor === "topleft") {
    return {
      ...pxRect,
      anchorX: pxRect.left,
      anchorY: pxRect.top,
    };
  }

  return pxRect;
}
