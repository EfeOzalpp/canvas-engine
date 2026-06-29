import { createSurfaceSignalCore, type InstalledSurfaceSignal, type SurfaceSignalCoreOptions } from "../surface/core";
import { registerViewportSubscriber } from "./viewport-resize";

export interface InstallGlobalSurfaceSignalOptions extends SurfaceSignalCoreOptions {
  canvasId: string;
}

export function installGlobalSurfaceSignal(options: InstallGlobalSurfaceSignalOptions): InstalledSurfaceSignal {
  const core = createSurfaceSignalCore(options);
  const unregister = registerViewportSubscriber(options.canvasId, core.markDirty);

  return {
    get current() { return core.current; },
    addReaction: core.addReaction,
    cleanup() {
      core.cleanup();
      unregister();
    },
  };
}