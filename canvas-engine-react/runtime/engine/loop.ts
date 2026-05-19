// src/canvas-engine/runtime/engine/loop.ts

import type { PLike } from "../p/makeP";
import { normalizeDprTransform, reassertDprTransformIfMutated } from "../util/transform";

import type { SceneLookupKey } from "../../adjustable-rules/sceneState";
import type { CanvasPaddingSpec } from "../../adjustable-rules/canvas-padding/index";
import type { BackgroundSpec } from "../../adjustable-rules/backgrounds";

import { getPaddingSpecForState } from "../geometry/padding";
import { computeGridCached, type GridCacheState, type GridMetrics } from "../geometry/gridCache";

import {
  computeFogState,
  createBackgroundAnchorContext,
  createBgCache,
  createBottomFogStepper,
  createRowLightCache,
  createSkyFogCache,
  drawBackgroundStarsOnly,
  drawFogOverlay,
  drawSkyFogLightOverlay,
} from "../render/atmosphere";
import { drawGridOverlay } from "../render/gridOverlay";
import { sortItemsForRenderInto } from "../render/itemOrder";
import { getGradientRGB, type PaletteCache } from "../render/palette";
import { drawGhosts, type Ghost } from "../render/ghosts";
import { drawItems } from "../render/items";
import { createSceneLightContext } from "../../modifiers/index";

import { drawItemFromRegistry } from "../shapes/draw";
import type { ShapeRegistry } from "../shapes/registry";
import type { RuntimeShapeOptions } from "../shapes/types";

import type { EngineFieldItem } from "./field";
import type { DebugFlags } from "../debug/flags";
import type { LiveState } from "./itemLifecycle";

export interface LoopDeps {
  p: PLike;

  // state
  field: { items: EngineFieldItem[]; visible: boolean };

  style: {
    r: number;
    perShapeScale: Record<string, number>;
    gradientRGBOverride: null | { r: number; g: number; b: number };
    blend: number;
    exposure: number;
    contrast: number;
    appearMs: number;
    exitMs: number;
    darkMode: boolean;
    isRealMobile: boolean;
    fog: boolean;
    debug: DebugFlags;
  };

  inputs: { liveAvg: number };

  // policy getters (so loop doesn't own policy vars)
  getSceneLookup: () => SceneLookupKey;
  getPaddingSpecOverride: () => CanvasPaddingSpec | null;
  getBackgroundSpecOverride: () => BackgroundSpec | null;

  // caches
  gridCache: GridCacheState;
  paletteCache: PaletteCache;
  // lifecycle state
  liveStates: Map<string, LiveState>;
  ghostsRef: { current: Ghost[] };

  // shapes
  shapeRegistry: ShapeRegistry;

  // ordering
  Z: Record<string, number>;
}

export function createEngineTicker(deps: LoopDeps) {
  const {
    p,
    field,
    style,
    inputs,
    getSceneLookup,
    getPaddingSpecOverride,
    getBackgroundSpecOverride,
    gridCache,
    paletteCache,

    liveStates,
    ghostsRef,
    shapeRegistry,
    Z,
  } = deps;

  let running = true;

  // Offscreen caches — redrawn only when inputs change, blitted each frame
  const bgCache = createBgCache();
  const rowLightCache = createRowLightCache();
  const skyFogCache = createSkyFogCache();

  const sortedItemsScratch: EngineFieldItem[] = [];
  const regularItemsScratch: EngineFieldItem[] = [];
  const fogForegroundItemsScratch: EngineFieldItem[] = [];
  const regularSharedScratch: RuntimeShapeOptions = {};
  const fogForegroundSharedScratch: RuntimeShapeOptions = {};
  const regularShapeOccurrenceScratch = new Map<string, number>();
  const fogForegroundShapeOccurrenceScratch = new Map<string, number>();

  let sortedItemsSource: EngineFieldItem[] | null = null;
  let sortedItemsMetrics: GridMetrics | null = null;
  let sortedItemsZ: Record<string, number> | null = null;

  function sortedItemsForFrame(items: EngineFieldItem[], metrics: GridMetrics): EngineFieldItem[] {
    if (items !== sortedItemsSource || metrics !== sortedItemsMetrics || Z !== sortedItemsZ) {
      sortItemsForRenderInto(sortedItemsScratch, items, { Z, gridMetrics: metrics });
      sortedItemsSource = items;
      sortedItemsMetrics = metrics;
      sortedItemsZ = Z;
    }
    return sortedItemsScratch;
  }

  function renderOneSandboxed(
    it: EngineFieldItem,
    rEff: number,
    sharedOpts: RuntimeShapeOptions,
    rootAppearK: number
  ) {
    p.push();
    try {
      // Keep all shape rendering synchronized to one global liveAvg signal.
      // This avoids per-condition color divergence (mixed red/green at the same moment).
      const itemAvg = inputs.liveAvg;
      const itemGradient = sharedOpts.gradientRGB;

      sharedOpts.liveAvg = itemAvg;
      sharedOpts.gradientRGB = itemGradient;
      sharedOpts.rootAppearK = rootAppearK;
      sharedOpts.usedRows = gridCache.usedRows;

      // Override cell/cellW/cellH with the actual tile size for this item's row.
      // baseShared carries the horizon reference (smallest tile); shapes that use
      // cell * fraction would otherwise size themselves relative to the horizon
      // regardless of where they sit on screen.
      const fp = it.footprint;
      const m = gridCache.metrics;
      if (fp != null && m.rowHeights.length > 0) {
        // cellH/cell use bottomRow to avoid pxH mismatch on multi-row shapes.
        // cellW uses r0 (top row) to match cellAnchorToPx2 which uses r0 for x.
        const r0 = fp.r0;
        const bottomRow = r0 + fp.h - 1;
        sharedOpts.cell  = m.rowHeights[bottomRow]  ?? gridCache.cellH;
        sharedOpts.cellH = m.rowHeights[bottomRow]  ?? gridCache.cellH;
        sharedOpts.cellW = m.cellWPerRow[r0]        ?? gridCache.cellW;

      }

      drawItemFromRegistry(shapeRegistry, p, it, rEff, sharedOpts);
    } finally {
      p.pop();
      reassertDprTransformIfMutated(p);
    }
  }

  function tick(now: number) {
    if (!running) return;

    // advance frame timing (deltaTime etc.)
    p.__tick(now);

    normalizeDprTransform(p);
    const currentBgSpec = getBackgroundSpecOverride();
    const sceneLookup = getSceneLookup();
    const liveAvgSignal = inputs.liveAvg;
    const spec = getPaddingSpecForState(
      p.width,
      getSceneLookup(),
      getPaddingSpecOverride()
    );

    const grid = computeGridCached(gridCache, p, spec);
    const backgroundAnchors = createBackgroundAnchorContext({
      p,
      padding: spec,
      metrics: grid.metrics,
    });

    bgCache(p, sceneLookup, currentBgSpec, liveAvgSignal, backgroundAnchors);
    drawBackgroundStarsOnly(p, sceneLookup, currentBgSpec, 1, liveAvgSignal);

    drawGridOverlay(
      p,
      {
        cellW: grid.cellW,
        cellH: grid.cellH,
        ox: grid.ox,
        oy: grid.oy,
        rows: grid.rows,
        cols: grid.cols,
        usedRows: grid.usedRows,
        metrics: grid.metrics,
      },
      spec,
      {
        enabled: style.debug.grid,
        gridAlpha: style.debug.gridAlpha,
      }
    );

    // time model used by shapes / particles
    const tMs = p.millis();
    const gradientRGB = getGradientRGB({
      liveAvg: liveAvgSignal,
      override: style.gradientRGBOverride,
      cache: paletteCache,
    });

    const sortedItems = sortedItemsForFrame(field.items, grid.metrics);
    regularItemsScratch.length = 0;
    fogForegroundItemsScratch.length = 0;
    let lightItem: EngineFieldItem | null = null;
    for (const item of sortedItems) {
      if (item.shape === "sun") {
        lightItem ??= item;
        fogForegroundItemsScratch.push(item);
      } else {
        regularItemsScratch.push(item);
      }
    }

    const sceneLight = createSceneLightContext({
      lightItem,
      darkMode: style.darkMode,
      canvasW: p.width,
      canvasH: p.height,
      cell: grid.cell,
      cellW: grid.cellW,
      cellH: grid.cellH,
      ...grid.metrics,
    });

    const baseShared: RuntimeShapeOptions = {
      cell: grid.cell,
      cellW: grid.cellW,
      cellH: grid.cellH,
      ...grid.metrics,
      gradientRGB,
      blend: style.blend,
      liveAvg: liveAvgSignal,
      alpha: 235,
      timeMs: tMs,
      exposure: style.exposure,
      contrast: style.contrast,
      darkMode: style.darkMode,
      lightCtx: sceneLight,
    };

    ghostsRef.current = drawGhosts({
      nowMs: tMs,
      ghosts: ghostsRef.current,
      exitMs: style.exitMs,
      baseShared,
      perShapeScale: style.perShapeScale,
      baseR: style.r,
      renderOne: (it, rEff, shared, rootAppearK) =>
        { renderOneSandboxed(it, rEff, shared, rootAppearK); },
    });

    const fog = style.fog ? computeFogState({
      p,
      metrics: grid.metrics,
      darkMode: style.darkMode,
      isRealMobile: style.isRealMobile,
      horizonPos: spec.horizonPos,
    }) : null;

    rowLightCache({
      p,
      metrics: grid.metrics,
      light: sceneLight,
      alpha: style.darkMode ? 0.18 : 0.11,
      minRow: fog ? fog.fogPeakRow + 1 : 0,
    });

    const bottomFogStepper = fog ? createBottomFogStepper(p, fog) : null;

    drawItems({
      items: regularItemsScratch,
      visible: field.visible,
      nowMs: tMs,
      appearMs: style.appearMs,
      Z,
      liveStates,
      perShapeScale: style.perShapeScale,
      baseR: style.r,
      baseShared,
      gridMetrics: grid.metrics,
      itemsAreSorted: true,
      sharedScratch: regularSharedScratch,
      shapeOccurrenceScratch: regularShapeOccurrenceScratch,
      renderOne: (it, rEff, shared, rootAppearK) =>
        { renderOneSandboxed(it, rEff, shared, rootAppearK); },
      onBeforeGroundItem: bottomFogStepper ? ({ depth }) => {
        bottomFogStepper.drawUntilDepth(depth);
      } : undefined,
      onAfterRowGroup: bottomFogStepper ? () => {
        bottomFogStepper.drawNext();
      } : undefined,
    });

    if (bottomFogStepper) {
      bottomFogStepper.drawRemaining();
    }

    if (fog) {
      skyFogCache(p, fog);
      drawSkyFogLightOverlay({
        p,
        fog,
        light: sceneLight,
        alpha: style.darkMode ? 0.22 : 0.14,
      });
    }

    drawFogOverlay(p, sceneLookup, currentBgSpec, 1, liveAvgSignal, backgroundAnchors);

    if (fogForegroundItemsScratch.length > 0) {
      drawItems({
        items: fogForegroundItemsScratch,
        visible: field.visible,
        nowMs: tMs,
        appearMs: style.appearMs,
        Z,
        liveStates,
        perShapeScale: style.perShapeScale,
        baseR: style.r,
        baseShared,
        gridMetrics: grid.metrics,
        itemsAreSorted: true,
        sharedScratch: fogForegroundSharedScratch,
        shapeOccurrenceScratch: fogForegroundShapeOccurrenceScratch,
        renderOne: (it, rEff, shared, rootAppearK) =>
          { renderOneSandboxed(it, rEff, shared, rootAppearK); },
      });
    }
  }

  return {
    tick,
    stop() {
      running = false;
    },
  };
}
