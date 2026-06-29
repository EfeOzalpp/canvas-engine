// src/canvas-engine/runtime/index.ts

import type {
  EngineControls,
  EngineFieldStyle,
  EngineInputsPayload,
  EngineSceneSource,
  EngineSceneProfile,
  EngineSetFieldItemsOptions,
  StartCanvasEngineOpts,
} from "./engine/types";
import type { EngineFieldItem } from "./engine/field";

import { createEngineTicker, type LoopDeps } from "./engine/loop";
import { registerEngineFrame, unregisterEngineFrame } from "./engine/scheduler";
import {
  reconcileLiveStatesOnFieldUpdate,
  type LiveState,
} from "./engine/itemLifecycle";
import { createSceneSurfaceLifecycleState } from "./engine/sceneSurfaceLifecycle";
import {
  createEngineField,
  createEngineInputs,
  createEngineStyle,
  type EngineEffectState,
  type EngineRuntimeState,
} from "./engine/state";

import {
  ensureMount,
  applyCanvasStyle,
  registerEngineInstance,
  stopCanvasEngine,
  isCanvasRunning,
  stopAllCanvasEngines,
} from "./platform/mount";
import { makeP, type RuntimeSurface } from "./p/makeP";

import { clamp01 } from "./util/easing";

import { DEFAULT_RENDER_CACHE_POLICY } from "./render/cache-policy";

import { resolveBounds } from "./geometry/bounds";
import { createGridCache, invalidateGridCache, type RuntimeLayoutState } from "./geometry/gridCache";
import { installResizeHandlers } from "./platform/resize";

import { createDefaultShapeRegistry, type RuntimeShapeServices, type ShapeRegistry } from "./shape-adapter/registry";
import { createParticleStore } from "../modifiers/particles";


export type { EngineControls as CanvasEngineControls } from "./engine/types";

const FIELD_REFRESH_APPEAR_MS = 180;
const FIELD_REFRESH_STAGGER_MS = 120;

export function startCanvasEngine(opts: StartCanvasEngineOpts = {}): EngineControls {
  const { mount = "#canvas-root", onReady, dprMode = "fixed1", zIndex = 2, layout = "fixed", fpsCap, initialDarkMode } = opts;

  const parentEl = ensureMount(mount, zIndex, layout);

  const style = createEngineStyle(initialDarkMode);
  const inputs = createEngineInputs();
  const field = createEngineField();

  let ENGINE_SEQ = 0;

  let sceneProfile: EngineSceneProfile = {
    lookupKey: "start",
    paddingSpec: null,
    background: null,
    ambientParticles: null,
    fog: null,
    foliage: null,
    renderCache: DEFAULT_RENDER_CACHE_POLICY,
  };

  // Per-item appear state is owned by this engine instance.
  const liveStates = new Map<string, LiveState>();
  const particleStore = createParticleStore();
  const sceneSurface = createSceneSurfaceLifecycleState();

  const canvasEl = document.createElement("canvas");
  applyCanvasStyle(canvasEl);
  parentEl.appendChild(canvasEl);

  const ctx = canvasEl.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("2D canvas context not available");
  const p = makeP(canvasEl, ctx);

  // layout + caches
  const gridCache = createGridCache();
  const cleanupResize = installResizeHandlers({
    parentEl,
    canvasEl,
    p,
    dprMode,
    resizeTo: () => resolveBounds(parentEl, opts.bounds),
    onAfterResize: () => {
      invalidateGridCache(gridCache);
    },
  });

  // shapes: registry (overrideable)
  const shapeRegistry: ShapeRegistry = opts.shapeRegistry ?? createDefaultShapeRegistry();

  const surface: RuntimeSurface = { p };
  const engineState: EngineRuntimeState = { field, style, inputs };
  const sceneSource: EngineSceneSource = { getProfile: () => sceneProfile };
  const layoutState: RuntimeLayoutState = { gridCache };
  const effectState: EngineEffectState = { liveStates, particleStore, sceneSurface };
  const shapeServices: RuntimeShapeServices = { registry: shapeRegistry };

  const frameId = `${mount}::${String(++ENGINE_SEQ)}`;

  const loopDeps: LoopDeps = {
    surface,
    engineState,
    sceneSource,
    layout: layoutState,
    effects: effectState,
    shapes: shapeServices,
  };

  const ticker = createEngineTicker(loopDeps);

  // stop + global instance registry

  let unregister: null | (() => void) = null;
  let didStop = false;

  function stop() {
    if (didStop) return;
    didStop = true;

    try {
      cleanupResize();
    } catch {}

    try {
      unregisterEngineFrame(frameId);
    } catch {}

    try {
      ticker.stop();
    } catch {}

    try {
      particleStore.clear();
    } catch {}

    try {
      canvasEl.remove();
    } catch {}

    try {
      unregister?.();
    } catch {}
  }

  // controls

  function setInputs(args: EngineInputsPayload = {}) {
    if (typeof args.liveAvg === "number") inputs.liveAvg = clamp01(args.liveAvg);
    if ("spotlight" in args) inputs.spotlight = args.spotlight ?? null;
    if ("hoveredItemId" in args) inputs.hoveredItemId = args.hoveredItemId ?? null;
    if ("selectedItemId" in args) inputs.selectedItemId = args.selectedItemId ?? null;
  }

  function setFieldItems(nextItems: EngineFieldItem[] = [], options: EngineSetFieldItemsOptions = {}) {
    const safeNextItems = Array.isArray(nextItems) ? nextItems : [];
    const isRefresh = field.items.length > 0 && safeNextItems.length > 0;
    const shouldReplayAppear = !isRefresh || options.replayAppear !== false;
    reconcileLiveStatesOnFieldUpdate({
      prevItems: field.items,
      nextItems: safeNextItems,
      liveStates,
      nowMs: p.millis(),
      appearMs: isRefresh
        ? shouldReplayAppear
          ? Math.min(style.appearMs, FIELD_REFRESH_APPEAR_MS)
          : 0
        : style.appearMs,
      appearStaggerMs: isRefresh
        ? shouldReplayAppear
          ? Math.min(style.appearStaggerMs, FIELD_REFRESH_STAGGER_MS)
          : 0
        : style.appearStaggerMs,
    });

    field.items = safeNextItems;
  }

  function setFieldStyle(args: EngineFieldStyle = {}) {
    const { r, gradientRGBOverride, blend, perShapeScale, exposure, contrast, appearMs, appearStaggerMs } = args;

    if (typeof r === "number" && Number.isFinite(r) && r > 0) style.r = r;

    if ("gradientRGBOverride" in args) {
      style.gradientRGBOverride = gradientRGBOverride ?? { r: 255, g: 255, b: 255 };
    }

    if (typeof blend === "number") style.blend = Math.max(0, Math.min(1, blend));
    if (typeof exposure === "number") style.exposure = Math.max(0.1, Math.min(3, exposure));
    if (typeof contrast === "number") style.contrast = Math.max(0.5, Math.min(2, contrast));

    if (perShapeScale && typeof perShapeScale === "object") {
      style.perShapeScale = { ...style.perShapeScale, ...perShapeScale };
    }

    if (typeof appearMs === "number" && Number.isFinite(appearMs) && appearMs >= 0) style.appearMs = appearMs | 0;
    if (typeof appearStaggerMs === "number" && Number.isFinite(appearStaggerMs) && appearStaggerMs >= 0) {
      style.appearStaggerMs = appearStaggerMs | 0;
    }
    if (typeof args.darkMode === "boolean") style.darkMode = args.darkMode;
    if (typeof args.fog === "boolean") style.fog = args.fog;
    if ("shapeLightSource" in args) {
      const source = args.shapeLightSource;
      style.shapeLightSource =
        source &&
        typeof source.xK === "number" &&
        Number.isFinite(source.xK) &&
        typeof source.yK === "number" &&
        Number.isFinite(source.yK)
          ? {
              xK: source.xK,
              yK: source.yK,
              paletteClosenessK:
                typeof source.paletteClosenessK === "number" &&
                Number.isFinite(source.paletteClosenessK)
                  ? Math.max(0, Math.min(1, source.paletteClosenessK))
                  : undefined,
            }
          : null;
    }

    if (args.debug && typeof args.debug === "object") {
      const d = args.debug;
      if (typeof d.grid === "boolean") style.debug.grid = d.grid;
      if (typeof d.gridAlpha === "number") style.debug.gridAlpha = Math.max(0, Math.min(1, d.gridAlpha));
    }
  }

  function setFieldVisible(v: boolean) {
    field.visible = v;
  }
  function setVisibleCanvas(v: boolean) {
    canvasEl.style.opacity = v ? "1" : "0";
  }

  function setSceneProfile(next: EngineSceneProfile) {
    const nextProfile: EngineSceneProfile = {
      lookupKey: next.lookupKey,
      paddingSpec: next.paddingSpec ?? null,
      background: next.background ?? null,
      ambientParticles: next.ambientParticles ?? null,
      fog: next.fog ?? null,
      foliage: next.foliage ?? null,
      renderCache: next.renderCache,
    };

    const shouldInvalidateGrid =
      sceneProfile.lookupKey !== nextProfile.lookupKey ||
      sceneProfile.paddingSpec !== nextProfile.paddingSpec;

    sceneProfile = nextProfile;

    if (shouldInvalidateGrid) invalidateGridCache(gridCache);
  }

  const controls: EngineControls = {
    setInputs,
    setFieldItems,
    setFieldStyle,
    setFieldVisible,
    setVisible: setVisibleCanvas,
    setSceneProfile,
    stop,
    sampleShapeHitMask: ticker.sampleShapeHitMask,
    getSortedFieldItems: ticker.getSortedItems,
    get canvas() {
      return canvasEl;
    },
    field,
    layout: gridCache,
  };

  // Register this engine instance (stops any previous one for same mount/element)
  unregister = registerEngineInstance({
    mount,
    parentEl,
    stop,
  });

  onReady?.(controls);
  registerEngineFrame(frameId, ticker.tick, { priority: zIndex, fpsCap });
  return controls;
}

export { stopCanvasEngine, isCanvasRunning, stopAllCanvasEngines };

export default startCanvasEngine;
