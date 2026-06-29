import { drawStars } from "../../../../../background/presets/stars";
import { getCanvasConfig, type InstancedPassDefinition } from "../../registry";

export const backgroundStarsPass = {
  id: "background-stars",
  run(canvasId, api) {
    const spec = getCanvasConfig(canvasId)?.background?.spec.stars;
    if (!spec) return;
    drawStars(api, spec);
  },
} satisfies InstancedPassDefinition;
