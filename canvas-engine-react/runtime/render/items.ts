// src/canvas-engine/runtime/render/items.ts

import type { EngineFieldItem } from "../engine/field";
import type { LiveState } from "../engine/itemLifecycle";
import type { GridMetrics } from "../../grid-layout/gridMetrics";
import type { RuntimeShapeOptions } from "../shapes/types";
import { renderDepthOfItem, sortItemsForRender } from "./itemOrder";
import { clamp01, easeOutCubic } from "../util/easing";

// drawItems is called by engine/loop.ts during every canvas frame.
// loop.ts owns the frame-wide context: time, grid metrics, lighting, palette,
// fog hooks, and the actual "draw one shape" function.
// This helper owns the item pass: sort the items, track appear state, enrich
// the shared shape options, then hand each item back to renderOne.
export function drawItems(params: {
  // The loop may pass a subset, for example regular ground/sky items first
  // and sun/fog-foreground items later.
  items: EngineFieldItem[];
  visible: boolean;
  nowMs: number;
  appearMs: number;
  // Z is the shape-level painter order table. Lower values draw earlier.
  Z: Record<string, number>;
  // Persistent per-item state lives outside this function so appear animation
  // does not restart every frame.
  liveStates: Map<string, LiveState>;
  perShapeScale: Record<string, number> | undefined;
  baseR: number;
  // baseShared is created in loop.ts. It contains data every shape needs:
  // cell size, grid metrics, gradient color, time, dark mode, light context, etc.
  baseShared: RuntimeShapeOptions;
  gridMetrics?: GridMetrics;
  itemsAreSorted?: boolean;
  sharedScratch?: RuntimeShapeOptions;
  shapeOccurrenceScratch?: Map<string, number>;
  // renderOne comes from loop.ts instead of being imported here because loop.ts
  // wraps shape drawing with p.push()/p.pop() and DPR transform repair.
  renderOne: (it: EngineFieldItem, rEff: number, shared: RuntimeShapeOptions, rootAppearK: number) => void;
  // These hooks let the loop insert fog layers between item depths without
  // making this file know how fog is drawn.
  onBeforeGroundItem?: (args: { depth: number }) => void;
  onAfterRowGroup?: (args: { previousDepth: number; nextDepth: number }) => void;
}) {
  const {
    items,
    visible,
    nowMs,
    appearMs,
    Z,
    liveStates,
    perShapeScale,
    baseR,
    baseShared,
    gridMetrics,
    itemsAreSorted = false,
    sharedScratch,
    shapeOccurrenceScratch,
    renderOne,
    onBeforeGroundItem,
    onAfterRowGroup,
  } = params;

  if (!visible || !items.length) return;

  const sorted = itemsAreSorted ? items : sortItemsForRender(items, { Z, gridMetrics });

  const shapeOccurrence = shapeOccurrenceScratch ?? new Map<string, number>();
  shapeOccurrence.clear();
  const shared = sharedScratch ?? {};

  let prevBand: number | undefined;
  let prevDepth: number | undefined;

  for (const it of sorted) {
    const itZ = Z[it.shape] ?? 9;
    const itBand = itZ < 2 ? 0 : 1;
    const itDepth = renderDepthOfItem(it, gridMetrics);
    if (onBeforeGroundItem && itBand === 1) {
      onBeforeGroundItem({ depth: itDepth });
    }
    if (
      onAfterRowGroup &&
      itBand === 1 &&
      prevBand === 1 &&
      prevDepth !== undefined &&
      itDepth !== prevDepth
    ) {
      onAfterRowGroup({ previousDepth: prevDepth, nextDepth: itDepth });
    }
    prevBand = itBand;
    prevDepth = itDepth;
    let state = liveStates.get(it.id);
    if (!state) {
      state = {
        bornAtMs: nowMs,
      };
      liveStates.set(it.id, state);
    }

    const bornAt = state.bornAtMs;

    let easedK = 1;
    let alphaK = 1;

    if (appearMs > 0) {
      const appearT = clamp01((nowMs - bornAt) / appearMs);
      easedK = easeOutCubic(appearT);
      alphaK = easedK;
    }

    const scale = perShapeScale?.[it.shape] ?? 1;
    const rEff = baseR * scale;
    // Some shapes use occurrence index to vary repeated shapes deterministically,
    // so the third house/tree/etc. can pick a different palette or layout.
    const occurrenceIndex = shapeOccurrence.get(it.shape) ?? 0;
    shapeOccurrence.set(it.shape, occurrenceIndex + 1);

    // Reuse one options object through the item pass. Shapes draw synchronously,
    // so this avoids allocating a new options object for every item every frame.
    Object.assign(shared, baseShared);
    shared.footprint = it.footprint;
    shared.alpha = Math.round(235 * alphaK);
    shared.itemId = it.id;
    shared.seedKey = `${it.shape}|${it.id}`;
    shared.shapeOccurrenceIndex = occurrenceIndex;

    renderOne(it, rEff, shared, easedK);
  }
}
