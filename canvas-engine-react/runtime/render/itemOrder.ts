import type { EngineFieldItem } from "../engine/field";
import type { GridMetrics } from "../../grid-layout/gridMetrics";
import { metricsDepth } from "../../grid-layout/gridMetrics";

export interface ItemOrderContext {
  Z: Record<string, number>;
  gridMetrics?: GridMetrics;
}

function itemDepth(item: EngineFieldItem, gridMetrics?: GridMetrics): number {
  return gridMetrics && item.footprint ? metricsDepth(gridMetrics, item.footprint) : item.y;
}

// Painter order is render policy, so it lives beside the item render pass.
function compareItemsForRender(
  a: EngineFieldItem,
  b: EngineFieldItem,
  { Z, gridMetrics }: ItemOrderContext
): number {
    const za = Z[a.shape] ?? 9;
    const zb = Z[b.shape] ?? 9;
    const bandA = za < 2 ? 0 : 1;
    const bandB = zb < 2 ? 0 : 1;
    if (bandA !== bandB) return bandA - bandB;

    const da = itemDepth(a, gridMetrics);
    const db = itemDepth(b, gridMetrics);
    if (da !== db) return da - db;

    if (za !== zb) return za - zb;
    return a.id.localeCompare(b.id);
}

// Painter order is render policy, so it lives beside the item render pass.
export function sortItemsForRender(
  items: EngineFieldItem[],
  context: ItemOrderContext
): EngineFieldItem[] {
  return items.slice().sort((a, b) => compareItemsForRender(a, b, context));
}

export function sortItemsForRenderInto(
  target: EngineFieldItem[],
  items: EngineFieldItem[],
  context: ItemOrderContext
): EngineFieldItem[] {
  target.length = items.length;
  for (let i = 0; i < items.length; i += 1) {
    target[i] = items[i];
  }
  target.sort((a, b) => compareItemsForRender(a, b, context));
  return target;
}

export function renderDepthOfItem(item: EngineFieldItem, gridMetrics?: GridMetrics): number {
  return itemDepth(item, gridMetrics);
}
