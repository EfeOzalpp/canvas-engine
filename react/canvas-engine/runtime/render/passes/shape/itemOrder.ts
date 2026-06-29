import type { EngineFieldItem } from "../../../engine/field";
import { metricsDepth, type GridMetrics } from "../../../geometry/gridCache";

interface ItemOrderContext {
  gridMetrics?: GridMetrics;
}

function itemDepth(item: EngineFieldItem, gridMetrics?: GridMetrics): number {
  return gridMetrics && item.footprint ? metricsDepth(gridMetrics, item.footprint) : item.y;
}

function itemScreenY(item: EngineFieldItem, gridMetrics?: GridMetrics): number {
  if (!gridMetrics || !item.footprint) return item.y;
  const bottomRow = Math.max(
    0,
    Math.min(gridMetrics.rowOffsetY.length - 1, item.footprint.r0 + item.footprint.h - 1)
  );
  return gridMetrics.rowOffsetY[bottomRow] ?? item.y;
}

const SEA_OVER_SAME_ROW_SHAPES = new Set(["house", "trees", "villa"]);

function compareSeaSameRowTie(a: EngineFieldItem, b: EngineFieldItem): number {
  const aSeaOverShape = a.shape === "sea" && SEA_OVER_SAME_ROW_SHAPES.has(b.shape);
  const bSeaOverShape = b.shape === "sea" && SEA_OVER_SAME_ROW_SHAPES.has(a.shape);
  if (aSeaOverShape) return 1;
  if (bSeaOverShape) return -1;
  return 0;
}

// Painter order follows projected depth. Screen Y is only a same-depth tie-breaker.
function compareItemsForRender(
  a: EngineFieldItem,
  b: EngineFieldItem,
  { gridMetrics }: ItemOrderContext
): number {
  const da = itemDepth(a, gridMetrics);
  const db = itemDepth(b, gridMetrics);
  if (da !== db) return da - db;

  const ya = itemScreenY(a, gridMetrics);
  const yb = itemScreenY(b, gridMetrics);
  if (ya !== yb) return ya - yb;

  const seaSameRowTie = compareSeaSameRowTie(a, b);
  if (seaSameRowTie !== 0) return seaSameRowTie;

  return a.id.localeCompare(b.id);
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

