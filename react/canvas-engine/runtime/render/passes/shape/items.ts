// src/canvas-engine/runtime/render/passes/shape/items.ts

import type { EngineFieldItem } from "../../../engine/field";
import type { LiveState } from "../../../engine/itemLifecycle";
import type { RuntimeShapeOptions } from "../../../shape-adapter/types";
import { copyRuntimeShapeOptionsInto } from "../../../shape-adapter/options";
import { clamp01, easeOutCubic } from "../../../util/easing";

// drawItems is called by engine/loop.ts during every canvas frame.
// loop.ts owns the frame-wide context: time, grid metrics, lighting, palette,
// and the actual "draw one shape" function.
// This helper owns the item pass: sort the items, track appear state, enrich
// the shape opts, then hand each item back to renderOne.
export function drawItems(params: {
  // Upstream params: frame/item state supplied by engine/loop.ts.
  items: EngineFieldItem[];
  visible: boolean;
  nowMs: number;
  appearMs: number;
  appearStaggerMs: number;
  selectedItemId: string | null;
  // Persistent per-item state lives outside this function so appear animation
  // does not restart every frame.
  liveStates: Map<string, LiveState>;
  perShapeScale: Record<string, number> | undefined;
  baseR: number;
  // baseOpts is created in loop.ts. It contains data every shape needs:
  // cell size, grid metrics, gradient color, time, dark mode, light context, etc.
  baseOpts: RuntimeShapeOptions;
  optsScratch?: RuntimeShapeOptions;
  shapeOccurrenceScratch?: Map<string, number>;
  // Downstream param: send the fully prepared opts back to loop.ts for sandboxed drawing.
  // renderOne comes from loop.ts instead of being imported here because loop.ts
  // wraps shape drawing with p.push()/p.pop() and DPR transform repair.
  renderOne: (it: EngineFieldItem, rEff: number, opts: RuntimeShapeOptions, rootAppearK: number) => void;
  // End params.
}) {
  const {
    items,
    visible,
    nowMs,
    appearMs,
    appearStaggerMs,
    selectedItemId,
    liveStates,
    perShapeScale,
    baseR,
    baseOpts,
    optsScratch,
    shapeOccurrenceScratch,
    renderOne,
  } = params;

  if (!visible || !items.length) return;

  const shapeOccurrence = shapeOccurrenceScratch ?? new Map<string, number>();
  shapeOccurrence.clear();
  const opts = optsScratch ?? {};
  const staggerDenom = Math.max(1, items.length - 1);

  const SELECT_MS = 10;

  // selectedItem is rendered last so it draws on top of all other shapes.
  let selectedItem: EngineFieldItem | null = null;
  let selectedEasedK = 1;
  let selectedReff = baseR;
  let selectedOccurrenceIndex = 0;

  function renderItem(it: EngineFieldItem, itemIndex: number, easedK: number, alphaK: number, rEff: number, occurrenceIndex: number) {
    const state = liveStates.get(it.id)!;
    copyRuntimeShapeOptionsInto(opts, baseOpts);

    const projection = opts.projection ?? (opts.projection = {});
    const style = opts.style ?? (opts.style = {});
    const lifecycle = opts.lifecycle ?? (opts.lifecycle = {});
    const identity = opts.identity ?? (opts.identity = {});
    const pass = opts.pass ?? (opts.pass = {});

    projection.footprint = it.footprint;
    projection.pixelFootprint = it.pixelFootprint;
    style.alpha = Math.round(235 * alphaK);
    identity.seedKey = `${it.shape}|${it.id}`;
    identity.shapeOccurrenceIndex = occurrenceIndex;
    pass.renderPass = "color";
    pass.maskColor = undefined;
    pass.maskAlpha = undefined;
    pass.depthTintColor = undefined;
    pass.depthTintK = undefined;

    let hoverK = 0;
    let selectK = 0;
    hoverK = state.hoverStartMs !== undefined && state.hoverEndMs === undefined ? 1 : 0;
    if (state.selectStartMs !== undefined) {
      selectK = state.selectEndMs !== undefined
        ? 1 - clamp01((nowMs - state.selectEndMs) / SELECT_MS)
        : clamp01((nowMs - state.selectStartMs) / SELECT_MS);
    }
    lifecycle.hoverK = hoverK;
    lifecycle.selectK = selectK;

    renderOne(it, rEff, opts, easedK);
  }

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const it = items[itemIndex];
    let state = liveStates.get(it.id);
    if (!state) {
      state = { bornAtMs: nowMs };
      liveStates.set(it.id, state);
    }

    const bornAt = state.bornAtMs;
    const itemAppearMs = state.appearMs ?? appearMs;
    const itemStaggerMs = state.appearStaggerMs ?? appearStaggerMs;
    const staggerSpan = itemAppearMs > 0 ? Math.max(0, itemStaggerMs) : 0;

    let easedK = 1;
    let alphaK = 1;

    if (itemAppearMs > 0) {
      // Stagger follows render order, so distant items resolve before nearer items.
      // It also spreads cache warmup instead of asking every pass to bake at once.
      const delayMs = (staggerSpan * itemIndex) / staggerDenom;
      const elapsedMs = nowMs - bornAt - delayMs;
      if (elapsedMs <= 0) continue;

      const appearT = clamp01(elapsedMs / itemAppearMs);
      easedK = easeOutCubic(appearT);
      alphaK = easedK;
    }

    const scale = perShapeScale?.[it.shape] ?? 1;
    const rEff = baseR * scale;
    // Some shapes use occurrence index to vary repeated shapes deterministically,
    // so the third house/tree/etc. can pick a different palette or layout.
    const occurrenceIndex = shapeOccurrence.get(it.shape) ?? 0;
    shapeOccurrence.set(it.shape, occurrenceIndex + 1);

    if (it.id === selectedItemId) {
      // Defer to after all other items so it renders on top.
      selectedItem = it;
      selectedEasedK = easedK;
      selectedReff = rEff;
      selectedOccurrenceIndex = occurrenceIndex;
      continue;
    }

    renderItem(it, itemIndex, easedK, alphaK, rEff, occurrenceIndex);
  }

  // Render selected item last so it always appears above all other shapes.
  if (selectedItem) {
    renderItem(selectedItem, items.length - 1, selectedEasedK, 1, selectedReff, selectedOccurrenceIndex);
  }
}
