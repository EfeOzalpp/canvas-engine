import type { RenderApi } from "../../../render-api";
import type { BackgroundSpec } from "../../../background";
import type { GridConfig } from "../../../generate-notation/grid-layout/fallback";
import type { PassCacheHandle, PassCacheStrategyName } from "../../lifecycle/cache/cache-registry";
import type { InvalidationSignalName } from "../../lifecycle/stable-signals/signal-registry";

// -- Canvas config --

export interface CanvasBackgroundConfig {
  spec: BackgroundSpec;
}

export type CanvasGridConfig = GridConfig;

export interface CanvasConfig {
  background?: CanvasBackgroundConfig;
  grid?: CanvasGridConfig;
}

const configs = new Map<string, CanvasConfig>();

export function setCanvasConfig(id: string, config: Partial<CanvasConfig>): void {
  configs.set(id, { ...configs.get(id), ...config });
}

export function getCanvasConfig(id: string): CanvasConfig | undefined {
  return configs.get(id);
}

export function clearCanvasConfig(id: string): void {
  configs.delete(id);
}

// -- Pass registry --

export interface InstancedPassDefinition {
  id: string;
  run: (canvasId: string, api: RenderApi) => void;
  // Name of the GPU cache strategy. Absent = no cache, runs every tick.
  cache?: PassCacheStrategyName;
  // Stable-signal type names that trigger invalidation for this pass when cached.
  invalidatedBy?: readonly InvalidationSignalName[];
}

const registeredPasses: InstancedPassDefinition[] = [];

export function registerInstancedPass(pass: InstancedPassDefinition): () => void {
  registeredPasses.push(pass);
  return () => {
    const i = registeredPasses.indexOf(pass);
    if (i !== -1) registeredPasses.splice(i, 1);
  };
}

export function getRegisteredInstancedPasses(): readonly InstancedPassDefinition[] {
  return registeredPasses;
}

export function runInstancedPasses(
  passes: readonly InstancedPassDefinition[],
  canvasId: string,
  api: RenderApi,
  passDirty: Map<InstancedPassDefinition, boolean>,
  passHandles: Map<InstancedPassDefinition, PassCacheHandle>,
): void {
  for (const pass of passes) {
    const handle = pass.cache ? passHandles.get(pass) : undefined;
    const dirty = !handle || passDirty.get(pass);

    if (dirty) {
      handle?.beginRender(api.surface);
      pass.run(canvasId, api);
      handle?.endRender();
      if (handle) {
        passDirty.set(pass, false);
        handle.blit();
      }
    } else {
      handle.blit();
    }
  }
}
