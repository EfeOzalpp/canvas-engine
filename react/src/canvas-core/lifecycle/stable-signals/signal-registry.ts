import type { SurfaceReaction } from "./surface/core";

export type InvalidationSignalName =
  | "surface-layout-change"
  | "surface-allocation-change"
  | "surface-projection-change";

export type SignalFactory = (
  canvasId: string,
  addReaction: (reaction: SurfaceReaction) => () => void,
  markDirty: () => void,
) => () => void;

const registry = new Map<InvalidationSignalName, SignalFactory>();

export function registerSignal(name: InvalidationSignalName, factory: SignalFactory): void {
  registry.set(name, factory);
}

export function getSignalFactory(name: InvalidationSignalName): SignalFactory | undefined {
  return registry.get(name);
}
