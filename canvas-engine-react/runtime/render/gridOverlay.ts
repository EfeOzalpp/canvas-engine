// src/canvas-engine/runtime/render/gridOverlay.ts

import type { PLike } from "../p/makeP";
import type { CanvasPaddingSpec } from "../../adjustable-rules/canvas-padding";
import type { GridMetrics } from "../../grid-layout/gridMetrics";

export interface GridOverlayParams {
  cellW: number;
  cellH: number;
  ox: number;
  oy: number;
  rows: number;
  cols: number;
  usedRows: number;
  metrics: GridMetrics;
}

export interface GridOverlayDebug {
  enabled: boolean;
  gridAlpha?: number;
  forbiddenAlpha?: number;
}

export function drawGridOverlay(
  p: PLike,
  grid: GridOverlayParams,
  spec: CanvasPaddingSpec,
  debug: GridOverlayDebug
) {
  if (!debug.enabled) return;

  const { cellW, cellH, ox, oy, rows, cols, usedRows, metrics } = grid;
  const { rowOffsetY, rowHeights, colsPerRow, cellWPerRow } = metrics;
  if (!cellW || !cellH || !rows || !cols) return;

  const rowTop = (r: number) => rowOffsetY.length ? (rowOffsetY[r] ?? r * cellH) : r * cellH;
  const rowH = (r: number) => rowHeights.length ? (rowHeights[r] ?? cellH) : cellH;
  const rowCols = (r: number) => colsPerRow.length ? (colsPerRow[r] ?? cols) : cols;
  const rowCellW = (r: number) => cellWPerRow.length ? (cellWPerRow[r] ?? cellW) : cellW;

  const ctx = p.drawingContext;
  const gridAlpha = debug.gridAlpha ?? 0.35;
  const forbAlpha = debug.forbiddenAlpha ?? 0.25;
  const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
  const lineColor = isDark ? "rgba(199, 199, 199, 0.1)" : "rgba(0, 0, 0, 0.1)";

  ctx.save();
  ctx.globalAlpha = gridAlpha;
  ctx.lineWidth = 1;
  ctx.strokeStyle = lineColor;

  // verticals — per row, since each row may have different column counts
  for (let r = 0; r < rows; r++) {
    const rCols = rowCols(r);
    const rCellW = rowCellW(r);
    const y0 = oy + rowTop(r);
    const y1 = y0 + rowH(r);
    for (let c = 0; c <= rCols; c++) {
      const x = Math.round(ox + c * rCellW) + 0.5;
      if (x < 0 || x > p.width) continue;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
    }
  }

  // horizontals
  for (let r = 0; r <= rows; r++) {
    const y = Math.round(oy + rowTop(r)) + 0.5;
    if (y < 0 || y > p.height) continue;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(p.width, y);
    ctx.stroke();
  }

  // usedRows boundary
  {
    const y = Math.round(oy + rowTop(usedRows)) + 0.5;
    ctx.strokeStyle = "rgba(255,0,0,0)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(p.width, y);
    ctx.stroke();
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  }

  // forbidden
  if (spec.forbidden) {
    ctx.globalAlpha = forbAlpha;
    ctx.fillStyle = "rgba(0,0,0,0)";

    for (let r = 0; r < rows; r++) {
      const rCols = rowCols(r);
      const rCellW = rowCellW(r);
      for (let c = 0; c < rCols; c++) {
        if (spec.forbidden(r, c, rows, rCols)) {
          ctx.fillRect(ox + c * rCellW, oy + rowTop(r), rCellW, rowH(r));
        }
      }
    }
  }

  ctx.restore();
}
