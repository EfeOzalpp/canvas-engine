import { backgroundPass } from "./background";
import { backgroundStarsPass } from "./background/presets/stars";
import { gridDrawPass } from "./grid-draw";
import { shapeDrawPass } from "./shape-draw";
import { getRegisteredInstancedPasses, type InstancedPassDefinition } from "./registry";

export const builtInInstancedPasses = [
  backgroundPass,
  backgroundStarsPass,
  gridDrawPass,
  shapeDrawPass,
] as const satisfies readonly InstancedPassDefinition[];

export function getPasses(): readonly InstancedPassDefinition[] {
  const registeredPasses = getRegisteredInstancedPasses();
  return registeredPasses.length === 0
    ? builtInInstancedPasses
    : [...builtInInstancedPasses, ...registeredPasses];
}

export {
  registerInstancedPass,
  runInstancedPasses,
  setCanvasConfig,
  getCanvasConfig,
  clearCanvasConfig,
} from "./registry";

export type { InstancedPassDefinition, CanvasConfig, CanvasBackgroundConfig, CanvasGridConfig } from "./registry";
