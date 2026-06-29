// src/canvas-engine/runtime/engine/loop.ts

import { normalizeDprTransform, reassertDprTransformIfMutated } from "../util/transform";

import { getPaddingSpecForState } from "../geometry/padding";
import { computeGridCached, type GridMetrics, type RuntimeLayoutState } from "../geometry/gridCache";

import {
  createBackgroundAnchorContext,
  createBgCache,
} from "../render/passes/background";
import {
  createFogLayerCache,
  createFogStateCache,
  createStarGeometryCache,
  drawBackgroundStarsOnly,
} from "../render/passes/atmosphere";
import { createFoliageLayerCache } from "../render/passes/foliage";
import { drawAmbientParticles } from "../render/passes/ambient-particles";
import {
  createEnvironmentLightResolver,
  createRowLightCache,
} from "../render/passes/light";
import { clearSceneSurfaceToUnderpaint } from "../render/surface";
import { drawGridOverlay } from "../debug";
import {
  createPaletteCache,
  createRuntimeShapeBaseOptions,
  createShapeRenderCache,
  drawItems,
  getGradientRGB,
  resolveShapeLightItem,
  sortItemsForRenderInto,
} from "../render/passes/shape";
import { resolveShapeDepthTint } from "../render/passes/depth";
import { createSceneLightContext } from "../../modifiers/index";
import { hoverBrightnessAdd } from "../../modifiers/global-event-driven/hover";
import { selectBrightnessAdd } from "../../modifiers/global-event-driven/select";

import { drawItemFromRegistry } from "../shape-adapter/draw";
import { shapeRegistrySupportsRenderPass, type RuntimeShapeServices } from "../shape-adapter/registry";
import type { RuntimeShapeOptions } from "../shape-adapter/types";
import type { RuntimeSurface } from "../p/makeP";
import {
  resolveRuntimeAmbientParticles,
  resolveRuntimeBackground,
  resolveRuntimeFoliage,
} from "./runtimeSceneVariants";
import { resolveSceneSurfaceFrame } from "./sceneSurfaceLifecycle";
import type { EngineFieldItem } from "./field";
import type { LiveState } from "./itemLifecycle";
import type { EngineEffectState, EngineRuntimeState } from "./state";
import type { EngineSceneSource } from "./types";

export interface LoopDeps {
  // runtime/p: live canvas draw facade and timing surface created by runtime/index.
  surface: RuntimeSurface;

  // engine/state: mutable field/style/input objects updated by EngineControls.
  engineState: EngineRuntimeState;

  // engine/types: app-resolved scene profile source; runtime/index owns the current value.
  sceneSource: EngineSceneSource;

  // geometry/gridCache: per-engine layout cache, invalidated by resize/profile changes.
  layout: RuntimeLayoutState;

  // engine/state: per-engine visual effect state that persists across frames.
  effects: EngineEffectState;

  // shape-adapter/registry: runtime bridge from item shape names to draw functions.
  shapes: RuntimeShapeServices;
}

export function createEngineTicker(deps: LoopDeps) {
  const surface = deps.surface;
  const engine = deps.engineState;
  const sceneSource = deps.sceneSource;
  const layout = deps.layout;
  const effects = deps.effects;
  const shapes = deps.shapes;

  let running = true;

  // Offscreen caches - redrawn only when inputs change, blitted each frame
  const bgCache = createBgCache();
  const rowLightCache = createRowLightCache();
  const fogLayerCache = createFogLayerCache();
  const fogStateCache = createFogStateCache();
  const starGeometryCache = createStarGeometryCache();
  const foliageLayerCache = createFoliageLayerCache();
  const paletteCache = createPaletteCache();
  const shapeRenderCache = createShapeRenderCache(() => sceneSource.getProfile().renderCache);

  const sortedItemsScratch: EngineFieldItem[] = [];
  const optsScratch: RuntimeShapeOptions = {};
  const shapeOccurrenceScratch = new Map<string, number>();
  const findEnvironmentLightSource = createEnvironmentLightResolver();

  let sortedItemsSource: EngineFieldItem[] | null = null;
  let sortedItemsMetrics: GridMetrics | null = null;

  let lastHoveredId: string | null = null;
  let lastSelectedId: string | null = null;

  function getOrCreateLiveState(itemId: string, nowMs: number): LiveState {
    let state = effects.liveStates.get(itemId);
    if (!state) {
      state = { bornAtMs: nowMs };
      effects.liveStates.set(itemId, state);
    }
    return state;
  }

  function updateInteractionStates(nowMs: number) {
    const hoveredId = engine.inputs.hoveredItemId;
    const selectedId = engine.inputs.selectedItemId;

    if (hoveredId !== lastHoveredId) {
      if (lastHoveredId) {
        const s = effects.liveStates.get(lastHoveredId);
        if (s) s.hoverEndMs = nowMs;
      }
      if (hoveredId) {
        const s = getOrCreateLiveState(hoveredId, nowMs);
        s.hoverStartMs = nowMs;
        s.hoverEndMs = undefined;
      }
      lastHoveredId = hoveredId;
    }

    if (selectedId !== lastSelectedId) {
      if (lastSelectedId) {
        const s = effects.liveStates.get(lastSelectedId);
        if (s) s.selectEndMs = nowMs;
      }
      if (selectedId) {
        const s = getOrCreateLiveState(selectedId, nowMs);
        s.selectStartMs = nowMs;
        s.selectEndMs = undefined;
      }
      lastSelectedId = selectedId;
    }
  }

  function clearRenderCaches() {
    bgCache.clear();
    rowLightCache.clear();
    fogLayerCache.clear();
    starGeometryCache.clear();
    foliageLayerCache.clear();
    shapeRenderCache.clear();
  }

  function sortedItemsForFrame(items: EngineFieldItem[], metrics: GridMetrics): EngineFieldItem[] {
    if (items !== sortedItemsSource || metrics !== sortedItemsMetrics) {
      sortItemsForRenderInto(sortedItemsScratch, items, { gridMetrics: metrics });
      sortedItemsSource = items;
      sortedItemsMetrics = metrics;
    }
    return sortedItemsScratch;
  }

  function renderOneSandboxed(
    // Upstream params: one prepared item draw from drawItems.
    it: EngineFieldItem,
    rEff: number,
    opts: RuntimeShapeOptions,
    rootAppearK: number
  ) {
    // End params. This function now owns final opts sync and draw routing.
    surface.p.push();
    try {
      const projection = opts.projection ?? (opts.projection = {});
      const styleOpts = opts.style ?? (opts.style = {});
      const lifecycle = opts.lifecycle ?? (opts.lifecycle = {});
      const pass = opts.pass ?? (opts.pass = {});

      // Keep all shape rendering synchronized to one global liveAvg signal.
      // This avoids per-condition color divergence (mixed red/green at the same moment).
      const itemAvg = engine.inputs.liveAvg;
      const itemGradient = styleOpts.gradientRGB;

      styleOpts.liveAvg = itemAvg;
      styleOpts.gradientRGB = itemGradient;
      lifecycle.rootAppearK = rootAppearK;
      projection.usedRows = layout.gridCache.usedRows;
      const depthTint = resolveShapeDepthTint({
        p: surface.p,
        item: it,
        gridMetrics: layout.gridCache.metrics,
        shapeAlpha: styleOpts.alpha,
        darkMode: styleOpts.darkMode,
      });
      pass.depthTintColor = depthTint?.color;
      pass.depthTintK = depthTint?.blend;

      // Override cell/cellW/cellH with the actual tile size for this item's row.
      // baseOpts carries the horizon reference (smallest tile); shapes that use
      // cell * fraction would otherwise size themselves relative to the horizon
      // regardless of where they sit on screen.
      const fp = it.footprint;
      const m = layout.gridCache.metrics;
      if (fp != null && m.rowHeights.length > 0) {
        // Use the footprint's bottom row for the whole local tile contract.
        // footprintToPx/cellAnchorToPx2 use the same row, so the color pass and
        // baked depth mask do not drift on multi-row perspective shapes.
        const r0 = fp.r0;
        const bottomRow = r0 + fp.h - 1;
        projection.cell  = m.rowHeights[bottomRow]  ?? layout.gridCache.cellH;
        projection.cellH = m.rowHeights[bottomRow]  ?? layout.gridCache.cellH;
        projection.cellW = m.cellWPerRow[bottomRow] ?? layout.gridCache.cellW;

      }

      // Hover/select effects.
      const lc = opts.lifecycle ?? {};
      const hoverK = lc.hoverK ?? 0;
      const selectK = lc.selectK ?? 0;
      const darkMode = styleOpts.darkMode === true;
      const brightnessDelta = hoverBrightnessAdd(hoverK, darkMode) + selectBrightnessAdd(selectK, darkMode);
      const brightnessBoost = 1 + brightnessDelta;

      const hasBrightness = Math.abs(brightnessDelta) > 0.001;
      const supportsDepthMask = shapeRegistrySupportsRenderPass(shapes.registry, it.shape, "depthMask");
      const brightnessOverlayAlpha = hasBrightness && supportsDepthMask && brightnessDelta > 0.001
        ? Math.min(0.5, brightnessDelta)
        : 0;

      if (hasBrightness && !supportsDepthMask) {
        surface.p.drawingContext.filter = `brightness(${brightnessBoost.toFixed(3)})`;
      }

      // Downstream draw path: far bitmap cache first, live draw fallback, then depth overlay.
      const drewCachedShape = shapeRenderCache.drawFarShapeBitmap({
        p: surface.p,
        shapeRegistry: shapes.registry,
        item: it,
        rEff,
        opts,
        gridMetrics: layout.gridCache.metrics,
        brightnessAlpha: brightnessOverlayAlpha,
      });
      if (!drewCachedShape) {
        const useLiveBrightnessFilter = hasBrightness && supportsDepthMask;
        if (useLiveBrightnessFilter) {
          surface.p.drawingContext.filter = `brightness(${brightnessBoost.toFixed(3)})`;
        }
        drawItemFromRegistry(shapes.registry, surface.p, it, rEff, opts);
        if (useLiveBrightnessFilter) {
          surface.p.drawingContext.filter = "none";
        }
      }

      shapeRenderCache.drawShapeDepthOverlay({
        p: surface.p,
        shapeRegistry: shapes.registry,
        item: it,
        rEff,
        opts,
        shapeWasDrawnLive: !drewCachedShape,
      });
    } finally {
      surface.p.pop();
      reassertDprTransformIfMutated(surface.p);
    }
  }

  function prepareSceneFrame(now: number) {
    // advance frame timing (deltaTime etc.)
    surface.p.__tick(now);

    normalizeDprTransform(surface.p);
    const sceneProfile = sceneSource.getProfile();
    const spotlight = engine.inputs.spotlight;
    const background = resolveRuntimeBackground(sceneProfile.background, spotlight);
    const ambientParticles = resolveRuntimeAmbientParticles(sceneProfile.ambientParticles, spotlight);
    const foliage = resolveRuntimeFoliage(sceneProfile.foliage, spotlight);
    const sceneSurface = resolveSceneSurfaceFrame(effects.sceneSurface, {
      nowMs: now,
      ready: sceneProfile.background != null,
    });
    const liveAvgSignal = engine.inputs.liveAvg;
    const spec = getPaddingSpecForState(
      surface.p.width,
      sceneProfile.lookupKey,
      sceneProfile.paddingSpec
    );

    const grid = computeGridCached(layout.gridCache, surface.p, spec);
    const backgroundAnchors = createBackgroundAnchorContext({
      p: surface.p,
      padding: spec,
      metrics: grid.metrics,
    });
    const environmentLightSource = findEnvironmentLightSource({
      items: engine.field.items,
      width: surface.p.width,
      style: engine.style,
    });
    const fog = engine.style.fog ? fogStateCache({
      p: surface.p,
      metrics: grid.metrics,
      darkMode: engine.style.darkMode,
      spec: sceneProfile.fog,
      lightSource: environmentLightSource,
      hasHorizon: typeof spec.horizonPos === "number",
    }) : null;

    return {
      sceneProfile,
      background,
      ambientParticles,
      foliage,
      sceneSurface,
      liveAvgSignal,
      spec,
      grid,
      backgroundAnchors,
      fog,
    };
  }

  type SceneFrameContext = ReturnType<typeof prepareSceneFrame>;

  function renderBackgroundPass(frame: SceneFrameContext) {
    if (!frame.sceneSurface.ready) return;
    bgCache(
      surface.p,
      frame.sceneProfile.lookupKey,
      frame.background,
      frame.liveAvgSignal,
      frame.backgroundAnchors,
      frame.sceneSurface.alpha
    );
  }

  function renderStarPass(frame: SceneFrameContext) {
    if (!frame.sceneSurface.ready) return;
    drawBackgroundStarsOnly(
      surface.p,
      frame.sceneProfile.lookupKey,
      frame.background,
      frame.sceneSurface.alpha,
      frame.liveAvgSignal,
      starGeometryCache
    );
  }

  function renderFoliagePass(frame: SceneFrameContext) {
    if (!frame.sceneSurface.ready) return;
    foliageLayerCache({
      p: surface.p,
      spec: frame.foliage,
      liveAvg: frame.liveAvgSignal,
      anchors: frame.backgroundAnchors,
      compositeAlpha: frame.sceneSurface.alpha,
    });
  }

  function renderAmbientParticlesPass(frame: SceneFrameContext) {
    if (!frame.sceneSurface.ready) return;
    drawAmbientParticles({
      p: surface.p,
      spec: frame.ambientParticles,
      liveAvg: frame.liveAvgSignal,
      timeMs: surface.p.millis(),
      compositeAlpha: frame.sceneSurface.alpha,
    });
  }

  function renderFogPass(frame: SceneFrameContext) {
    if (!frame.sceneSurface.ready) return;
    fogLayerCache(surface.p, frame.fog, frame.sceneSurface.alpha);
  }

  function renderDebugPass(frame: SceneFrameContext) {
    drawGridOverlay(
      surface.p,
      {
        cellW: frame.grid.cellW,
        cellH: frame.grid.cellH,
        ox: frame.grid.ox,
        oy: frame.grid.oy,
        rows: frame.grid.rows,
        cols: frame.grid.cols,
        usedRows: frame.grid.usedRows,
        metrics: frame.grid.metrics,
      },
      frame.spec,
      {
        enabled: engine.style.debug.grid,
        gridAlpha: engine.style.debug.gridAlpha,
      }
    );
  }

  function prepareShapeFrame(sceneFrame: SceneFrameContext) {
    // time model used by shapes / particles
    const tMs = surface.p.millis();
    const gradientRGB = getGradientRGB({
      liveAvg: sceneFrame.liveAvgSignal,
      override: engine.style.gradientRGBOverride,
      cache: paletteCache,
    });

    const sortedItems = sortedItemsForFrame(engine.field.items, sceneFrame.grid.metrics);
    const lightItem = resolveShapeLightItem({
      items: sortedItems,
      source: engine.style.shapeLightSource,
      width: surface.p.width,
      height: surface.p.height,
    });

    const sceneLight = createSceneLightContext({
      lightItem,
      darkMode: engine.style.darkMode,
      canvasW: surface.p.width,
      canvasH: surface.p.height,
      cell: sceneFrame.grid.cell,
      cellW: sceneFrame.grid.cellW,
      cellH: sceneFrame.grid.cellH,
      ...sceneFrame.grid.metrics,
    });

    const baseOpts = createRuntimeShapeBaseOptions({
      grid: sceneFrame.grid,
      style: engine.style,
      liveAvg: sceneFrame.liveAvgSignal,
      gradientRGB,
      sceneLight,
      timeMs: tMs,
      dtSec: surface.p.deltaTime / 1000,
      particleStore: effects.particleStore,
    });

    return {
      ...sceneFrame,
      tMs,
      sortedItems,
      sceneLight,
      baseOpts,
    };
  }

  type ShapeFrameContext = ReturnType<typeof prepareShapeFrame>;

  function renderLightingPass(frame: ShapeFrameContext) {
    if (typeof frame.spec.horizonPos !== "number") return;

    rowLightCache({
      p: surface.p,
      metrics: frame.grid.metrics,
      light: frame.sceneLight,
      alpha: engine.style.darkMode ? 0.18 : 0.11,
      compositeAlpha: frame.sceneSurface.alpha,
      minRow: 0,
    });
  }

  function renderItemPass(frame: ShapeFrameContext) {
    drawItems({
      items: frame.sortedItems,
      visible: engine.field.visible,
      nowMs: frame.tMs,
      appearMs: engine.style.appearMs,
      appearStaggerMs: engine.style.appearStaggerMs,
      selectedItemId: engine.inputs.selectedItemId,
      liveStates: effects.liveStates,
      perShapeScale: engine.style.perShapeScale,
      baseR: engine.style.r,
      baseOpts: frame.baseOpts,
      optsScratch,
      shapeOccurrenceScratch,
      renderOne: (it, rEff, opts, rootAppearK) =>
        { renderOneSandboxed(it, rEff, opts, rootAppearK); },
    });
  }

  function tick(now: number) {
    if (!running) return;

    updateInteractionStates(now);
    const sceneFrame = prepareSceneFrame(now);
    if (sceneFrame.sceneSurface.appearing) clearSceneSurfaceToUnderpaint(surface.p);
    renderBackgroundPass(sceneFrame);
    renderStarPass(sceneFrame);
    renderFoliagePass(sceneFrame);
    renderFogPass(sceneFrame);
    renderDebugPass(sceneFrame);

    const shapeFrame = prepareShapeFrame(sceneFrame);
    renderLightingPass(shapeFrame);
    renderItemPass(shapeFrame);
    renderAmbientParticlesPass(sceneFrame);
  }

  return {
    tick,
    stop() {
      running = false;
      clearRenderCaches();
    },
    sampleShapeHitMask: shapeRenderCache.sampleShapeHitMask,
    getSortedItems(): EngineFieldItem[] {
      return sortedItemsScratch;
    },
  };
}
