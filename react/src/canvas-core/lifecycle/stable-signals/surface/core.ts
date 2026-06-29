import { registerPreFrameHook } from "../../raf-scheduler";
import { runLifecycleReactions, type LifecycleReaction } from "../../reactions";
import { resolveSurfaceDpr, type SurfaceDprMode } from "./surface-dpr";
import { createSurfaceState, type SurfaceState } from "./surface-state";
import { deriveSurfaceLifecycleSignals, type SurfaceLifecycleSignal } from "./surface-signals";

let signalCounter = 0;

export type SurfaceReaction = LifecycleReaction<SurfaceLifecycleSignal>;

export interface SurfaceCssSizeInput {
  cssWidth: number;
  cssHeight: number;
}

export interface SurfaceSignalCoreOptions {
  dprMode: SurfaceDprMode;
  resolveCssSize: () => SurfaceCssSizeInput;
  reactions: readonly SurfaceReaction[];
}

export interface InstalledSurfaceSignal {
  readonly current: SurfaceState;
  addReaction: (reaction: SurfaceReaction) => () => void;
  cleanup: () => void;
}

export interface SurfaceSignalCore extends InstalledSurfaceSignal {
  markDirty: () => void;
}

export function createSurfaceSignalCore(options: SurfaceSignalCoreOptions): SurfaceSignalCore {
  const hookId = `surface-signal-${++signalCounter}`;
  let dirty = false;
  let current = createSurfaceState({ cssWidth: 1, cssHeight: 1, dpr: 1 });
  let previous: SurfaceState | null = null;
  const reactions: SurfaceReaction[] = [...options.reactions];

  function resolveNextSurfaceState(): SurfaceState {
    const cssSize = options.resolveCssSize();
    return createSurfaceState({
      cssWidth: cssSize.cssWidth,
      cssHeight: cssSize.cssHeight,
      dpr: resolveSurfaceDpr(options.dprMode),
    });
  }

  function commitSurfaceState(next: SurfaceState) {
    const signals = deriveSurfaceLifecycleSignals(previous, next);
    previous = next;
    current = next;
    for (const signal of signals) {
      runLifecycleReactions(reactions, signal);
    }
  }

  function refresh() {
    dirty = false;
    commitSurfaceState(resolveNextSurfaceState());
  }

  function addReaction(reaction: SurfaceReaction): () => void {
    reactions.push(reaction);
    return () => {
      const i = reactions.indexOf(reaction);
      if (i !== -1) reactions.splice(i, 1);
    };
  }

  const cleanupPreFrameHook = registerPreFrameHook(hookId, () => {
    const next = resolveNextSurfaceState();
    if (
      dirty ||
      next.cssWidth !== current.cssWidth ||
      next.cssHeight !== current.cssHeight ||
      next.pixelWidth !== current.pixelWidth ||
      next.pixelHeight !== current.pixelHeight
    ) {
      dirty = false;
      commitSurfaceState(next);
    }
  });

  refresh();

  return {
    get current() { return current; },
    markDirty() { dirty = true; },
    addReaction,
    cleanup() { cleanupPreFrameHook(); },
  };
}