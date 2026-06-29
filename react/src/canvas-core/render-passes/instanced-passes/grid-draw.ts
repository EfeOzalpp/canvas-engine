import { drawGridOverlay } from "../../../generate-notation/grid-layout";
import { resolveColumns } from "../../../generate-notation/grid-layout/resolveColumns";
import { isGridVisible } from "../pass-signals/grid-toggle";
import { getCanvasConfig, type InstancedPassDefinition } from "./registry";

export const gridDrawPass = {
  id: "grid-draw",
  cache: "fbo",
  invalidatedBy: ["surface-layout-change", "surface-allocation-change"],
  run(canvasId, api) {
    if (!isGridVisible()) return;
    const config = getCanvasConfig(canvasId)?.grid;
    if (!config) return;

    const { cssWidth: width, cssHeight: height } = api.surface;
    drawGridOverlay(api, resolveColumns({ width, height, rows: config.rows, horizon: config.horizon }));
  },
} satisfies InstancedPassDefinition;
