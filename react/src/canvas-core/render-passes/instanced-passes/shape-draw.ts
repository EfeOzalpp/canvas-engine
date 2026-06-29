import { compileNotationFiles } from "../../../parse";
import { resolveLocation } from "../../../generate-notation/enrich-header";
import { driveRender } from "../../../render-driver";
import { getCanvasConfig, type InstancedPassDefinition } from "./registry";

const shapes = compileNotationFiles();

export const shapeDrawPass = {
  id: "shape-draw",
  cache: "fbo",
  invalidatedBy: ["surface-layout-change", "surface-allocation-change"],
  run(canvasId, api) {
    const config = getCanvasConfig(canvasId)?.grid;
    if (!config) return;

    const { cssWidth: width, cssHeight: height } = api.surface;
    const located = resolveLocation(canvasId, shapes, { width, height, rows: config.rows, horizon: config.horizon });
    driveRender({ api, shapes: located });
  },
} satisfies InstancedPassDefinition;
