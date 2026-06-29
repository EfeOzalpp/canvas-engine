import { drawBackground } from "../../../../background";
import { gridFallback, resolveHorizon } from "../../../../generate-notation/grid-layout";
import { getCanvasConfig, type InstancedPassDefinition } from "../registry";

export const backgroundPass = {
  id: "background",
  cache: "fbo",
  invalidatedBy: ["surface-layout-change", "surface-allocation-change"],
  run(canvasId, api) {
    const config = getCanvasConfig(canvasId)?.background;
    if (!config) return;
    const gridConfig = getCanvasConfig(canvasId)?.grid ?? gridFallback;
    drawBackground(api, config.spec, { horizon: resolveHorizon(gridConfig) });
  },
} satisfies InstancedPassDefinition;
