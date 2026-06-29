import type { FrameClock } from "./raf-scheduler";
import type { RenderContext } from "../../get-context";
import type { RenderSurface } from "../../render-api";
import type { SurfaceReaction } from "./stable-signals";
import { getPasses, runInstancedPasses, type InstancedPassDefinition } from "../render-passes/instanced-passes";
import { getSignalFactory, type InvalidationSignalName } from "./stable-signals/signal-registry";
import { getCacheStrategy, type PassCacheHandle } from "./cache/cache-registry";
import "./cache";

export interface CanvasLoopDeps {
  id: string;
  renderContext: RenderContext;
  addSurfaceReaction: (reaction: SurfaceReaction) => () => void;
  getSurface: () => RenderSurface;
}

export interface CanvasLoop {
  tick: (clock: FrameClock) => void;
  stop: () => void;
}

export function createCanvasLoop(deps: CanvasLoopDeps): CanvasLoop {
  let running = true;

  const passDirty = new Map<InstancedPassDefinition, boolean>();
  const passHandles = new Map<InstancedPassDefinition, PassCacheHandle>();

  const passes = getPasses();
  const signalToPasses = new Map<InvalidationSignalName, InstancedPassDefinition[]>();

  for (const pass of passes) {
    passDirty.set(pass, true);
    for (const name of pass.invalidatedBy ?? []) {
      if (!signalToPasses.has(name)) signalToPasses.set(name, []);
      signalToPasses.get(name)!.push(pass);
    }
  }

  const unsubscribes: Array<() => void> = [];

  for (const [name, affectedPasses] of signalToPasses) {
    const factory = getSignalFactory(name);
    if (!factory) continue;
    unsubscribes.push(
      factory(deps.id, deps.addSurfaceReaction, () => {
        for (const pass of affectedPasses) passDirty.set(pass, true);
      })
    );
  }

  for (const pass of passes) {
    if (pass.cache) {
      const factory = getCacheStrategy(pass.cache);
      if (factory) {
        const handle = factory(deps.id, deps.renderContext.offscreen);
        if (handle) {
          passHandles.set(pass, handle);
          unsubscribes.push(() => handle.cleanup());
        }
      }
    }
  }

  function tick(_clock: FrameClock) {
    if (!running) return;

    const surface = deps.getSurface();
    if (surface.cssWidth !== deps.renderContext.surface.cssWidth ||
        surface.cssHeight !== deps.renderContext.surface.cssHeight ||
        surface.pixelWidth !== deps.renderContext.surface.pixelWidth ||
        surface.pixelHeight !== deps.renderContext.surface.pixelHeight) {
      deps.renderContext.resizeAllocation(surface);
    }

    deps.renderContext.beginFrame();
    deps.renderContext.clear({ r: 0, g: 0, b: 0, a: 1 });

    runInstancedPasses(passes, deps.id, deps.renderContext, passDirty, passHandles);

    deps.renderContext.endFrame();
  }

  return {
    tick,
    stop() {
      running = false;
      for (const unsub of unsubscribes) unsub();
    },
  };
}
