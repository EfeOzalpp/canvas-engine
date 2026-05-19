// src/canvas-engine/runtime/index.ts

import type {
  EngineControls,
  EngineFieldStyle,
  EngineInputsPayload,
  StartCanvasEngineOpts,
} from "./engine/types";
import type { EngineFieldItem } from "./engine/field";
import type { Ghost } from "./render/ghosts";

import {
  registerEngineInstance,
  stopCanvasEngine,
  isCanvasRunning,
  stopAllCanvasEngines,
} from "./engine/instanceRegistry";
import { createEngineTicker } from "./engine/loop";
import { registerEngineFrame, unregisterEngineFrame } from "./engine/scheduler";
import {
  reconcileLiveStatesOnFieldUpdate,
  type LiveState,
} from "./engine/itemLifecycle";
import {
  createEngineField,
  createEngineInputs,
  createEngineStyle,
} from "./engine/state";

import { ensureMount, applyCanvasStyle } from "./platform/mount";
import { makeP } from "./p/makeP";

import { clamp01 } from "./util/easing";

// Scene lookup key (BaseMode | SceneModifier) is used by runtime ticker to pick rules.
import type { SceneLookupKey } from "../adjustable-rules/sceneState";

import type { CanvasPaddingSpec } from "../adjustable-rules/canvas-padding";
import type { BackgroundSpec } from "../adjustable-rules/backgrounds";

import { resolveBounds } from "./geometry/bounds";
import { createGridCache, invalidateGridCache } from "./geometry/gridCache";
import { installResizeHandlers } from "./platform/resize";

import { createPaletteCache } from "./render/palette";
import { Z_INDEX } from "./shapes/zIndex";
import { createDefaultShapeRegistry, type ShapeRegistry } from "./shapes/registry";


export type { EngineControls as CanvasEngineControls } from "./engine/types";

export function startCanvasEngine(opts: StartCanvasEngineOpts = {}): EngineControls {
  const { mount = "#canvas-root", onReady, dprMode = "fixed1", zIndex = 2, layout = "fixed", fpsCap, initialDarkMode } = opts;

  const parentEl = ensureMount(mount, zIndex, layout);

  const style = createEngineStyle(initialDarkMode);
  const inputs = createEngineInputs();
  const field = createEngineField();

  let ENGINE_SEQ = 0;

  // runtime policy inputs
  let sceneLookupKey: SceneLookupKey = "start";
  let paddingSpecOverride: CanvasPaddingSpec | null = null;
  let backgroundSpecOverride: BackgroundSpec | null = null;

  // live/ghost state storage (owned by runtime)
  const liveStates = new Map<string, LiveState>();

  const canvasEl = document.createElement("canvas");
  applyCanvasStyle(canvasEl);
  parentEl.appendChild(canvasEl);

  const ctx = canvasEl.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("2D canvas context not available");
  const p = makeP(canvasEl, ctx);

  // layout + caches
  const gridCache = createGridCache();
  const paletteCache = createPaletteCache();
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

  // start loop
  const ghostsRef = { current: [] as Ghost[] };

  const frameId = `${mount}::${String(++ENGINE_SEQ)}`;

  const ticker = createEngineTicker({
    p,
    field,
    style,
    inputs,
    getSceneLookup: () => sceneLookupKey,
    getPaddingSpecOverride: () => paddingSpecOverride,
    getBackgroundSpecOverride: () => backgroundSpecOverride,
    gridCache,
    paletteCache,
    liveStates,
    ghostsRef,
    shapeRegistry,
    Z: Z_INDEX,
  });

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
      canvasEl.remove();
    } catch {}

    try {
      unregister?.();
    } catch {}
  }

  // controls

  function setInputs(args: EngineInputsPayload = {}) {
    if (typeof args.liveAvg === "number") inputs.liveAvg = clamp01(args.liveAvg);
  }

  function setFieldItems(nextItems: EngineFieldItem[] = []) {
    const safeNextItems = Array.isArray(nextItems) ? nextItems : [];
    reconcileLiveStatesOnFieldUpdate({
      prevItems: field.items,
      nextItems: safeNextItems,
      liveStates,
      nowMs: p.millis(),
    });

    field.items = safeNextItems;
  }

  function setFieldStyle(args: EngineFieldStyle = {}) {
    const { r, gradientRGBOverride, blend, perShapeScale, exposure, contrast, appearMs, exitMs } = args;

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
    if (typeof exitMs === "number" && Number.isFinite(exitMs) && exitMs >= 0) style.exitMs = exitMs | 0;
    if (typeof args.darkMode === "boolean") style.darkMode = args.darkMode;
    if (typeof args.isRealMobile === "boolean") style.isRealMobile = args.isRealMobile;
    if (typeof args.fog === "boolean") style.fog = args.fog;

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

  /**
   * Runtime "scene mode" is the *lookup key* used by ticker/rulesets.
   * This is NOT the SceneState object. SceneState is resolved in app-layer and
   * collapsed into a lookup key before reaching runtime.
   */
  function setSceneMode(next: SceneLookupKey) {
    sceneLookupKey = next;
    invalidateGridCache(gridCache);
  }

  function setPaddingSpec(spec: CanvasPaddingSpec | null) {
    paddingSpecOverride = spec ?? null;
    invalidateGridCache(gridCache);
  }

  function setBackgroundSpec(spec: BackgroundSpec | null) {
    backgroundSpecOverride = spec ?? null;
  }

  const controls: EngineControls = {
    setInputs,
    setFieldItems,
    setFieldStyle,
    setFieldVisible,
    setVisible: setVisibleCanvas,
    setSceneMode,
    setPaddingSpec,
    setBackgroundSpec,
    stop,
    get canvas() {
      return canvasEl;
    },
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

// Build a p-like facade on an existing canvas (no animation / no DOM attach).
export function makePFromCanvas(canvas: HTMLCanvasElement, { dpr = 1 } = {}) {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("2D canvas context not available");
  const p = makeP(canvas, ctx);
  const cssW = canvas.style.width ? parseFloat(canvas.style.width) : canvas.width / dpr;
  const cssH = canvas.style.height ? parseFloat(canvas.style.height) : canvas.height / dpr;
  p.pixelDensity(Math.max(1, dpr || 1));
  p.resizeCanvas(cssW, cssH);
  return p;
}

export { stopCanvasEngine, isCanvasRunning, stopAllCanvasEngines };

export default startCanvasEngine;
