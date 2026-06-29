import { createSurfaceSignalCore, type InstalledSurfaceSignal, type SurfaceSignalCoreOptions } from "../surface/core";
import type { SurfaceLifecycleSignal } from "../surface/surface-signals";
import { installElementResizeSignal } from "./element-resize";
import { registerSignal, type InvalidationSignalName } from "../signal-registry";

export interface InstallInstancedSurfaceSignalOptions extends SurfaceSignalCoreOptions {
  target: HTMLElement | null;
}

export function installInstancedSurfaceSignal(options: InstallInstancedSurfaceSignalOptions): InstalledSurfaceSignal {
  const core = createSurfaceSignalCore(options);
  const cleanupResize = options.target
    ? installElementResizeSignal(options.target, core.markDirty)
    : () => {};

  return {
    get current() { return core.current; },
    addReaction: core.addReaction,
    cleanup() {
      core.cleanup();
      cleanupResize();
    },
  };
}

function registerSurfaceInvalidationSignal(
  name: InvalidationSignalName,
  surfaceSignalType: SurfaceLifecycleSignal["type"],
) {
  registerSignal(name, (canvasId, addReaction, markDirty) =>
    addReaction({
      id: `invalidate.${name}:${canvasId}`,
      run(signal) {
        if (signal.type === surfaceSignalType) markDirty();
      },
    })
  );
}

// Fires only for the canvas whose surface emitted the matching surface signal.
// Self-registers here so factories are available as soon as stable-signals loads.
registerSurfaceInvalidationSignal("surface-layout-change", "layout-change");
registerSurfaceInvalidationSignal("surface-allocation-change", "allocation-change");
registerSurfaceInvalidationSignal("surface-projection-change", "projection-change");
