import type { OffscreenApi, RenderSurface } from "../../../render-api";

export type PassCacheStrategyName = "fbo";

export interface PassCacheHandle {
  cleanup: () => void;
  beginRender: (surface: RenderSurface) => void;
  endRender: () => void;
  blit: () => void;
}

export type PassCacheFactory = (
  canvasId: string,
  offscreen: OffscreenApi | undefined,
) => PassCacheHandle | undefined;

const registry = new Map<PassCacheStrategyName, PassCacheFactory>();

export function registerCacheStrategy(name: PassCacheStrategyName, factory: PassCacheFactory): void {
  registry.set(name, factory);
}

export function getCacheStrategy(name: PassCacheStrategyName): PassCacheFactory | undefined {
  return registry.get(name);
}
