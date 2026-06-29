import type { RenderApi } from "../../../render-api";
import type { ResolveColumnsOutput } from "../resolveColumns";

const BOTTOM_COLOR = { r: 1, g: 0.5, b: 0.1, a: 0.18 };
const TOP_COLOR = { r: 0.2, g: 0.5, b: 1.0, a: 0.18 };
const ALT_ALPHA = 0.09;

export function drawGridOverlay(api: RenderApi, grid: ResolveColumnsOutput): void {
  const { cssHeight: height } = api.surface;

  for (let r = 0; r < grid.bottomRowHeights.length; r++) {
    const rowH = grid.bottomRowHeights[r];
    const cssY = height - grid.bottomRowPositions[r] - rowH;

    for (let c = 0; c < grid.bottomColsPerRow[r]; c++) {
      const cellW = grid.bottomCellWidthsPerRow[r][c];
      const cssX = grid.bottomColumnPositions[r][c] - cellW / 2;
      const a = c % 2 === 0 ? BOTTOM_COLOR.a : ALT_ALPHA;
      api.drawShape({ x: cssX, y: cssY, w: cellW, h: rowH, color: { ...BOTTOM_COLOR, a }, kind: "rect" });
    }
  }

  for (let r = 0; r < grid.topRowHeights.length; r++) {
    const rowH = grid.topRowHeights[r];
    const cssY = height - grid.topRowPositions[r] - rowH;

    for (let c = 0; c < grid.topColsPerRow[r]; c++) {
      const cellW = grid.topCellWidthsPerRow[r][c];
      const cssX = grid.topColumnPositions[r][c] - cellW / 2;
      const a = c % 2 === 0 ? TOP_COLOR.a : ALT_ALPHA;
      api.drawShape({ x: cssX, y: cssY, w: cellW, h: rowH, color: { ...TOP_COLOR, a }, kind: "rect" });
    }
  }
}