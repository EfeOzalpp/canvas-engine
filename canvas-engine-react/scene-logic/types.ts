// src/canvas-engine/scene-logic/types.ts

import type { DeviceType } from "../shared/responsiveness";
import type { CanvasPaddingSpec } from "../adjustable-rules/canvas-padding";
import type { Place } from "../grid-layout/occupancy";
import type { ConditionKind, ShapeName } from "../adjustable-rules/shapeCatalog";
import type { Size } from "../adjustable-rules/conditionFootprints";
import type { SceneLookupKey } from "../adjustable-rules/sceneState";
import type { ScenePlacementRules } from "../adjustable-rules/placement-rules/index";
import type { EngineFieldItem } from "../runtime/engine/field";

export type FootRect = Place;

export interface PoolItem {
  id: EngineFieldItem["id"];
  shape: ShapeName;
  zoneIndex: number;    // index into the shape's zones array
  size: Size;           // footprint grid dimensions
  cond: ConditionKind;  // kept for color modifier pipeline (SHAPE_TO_COND)
  footprint?: FootRect;
  x?: number;
  y?: number;
}

// scene output stays narrower, but it must satisfy the runtime field item API.
export interface PlacedItem extends EngineFieldItem {
  shape: ShapeName;
  footprint: FootRect;
}

export interface ComposeOpts {
  mode: SceneLookupKey;
  padding: Record<DeviceType, CanvasPaddingSpec | null>;
  placements: ScenePlacementRules;
  allocAvg: number | undefined;
  reservedFootprints?: FootRect[];
  viewportKey?: number | string;
  ruleWidthPx?: number;
  canvas: { w: number; h: number };
  salt?: number;
}

export interface ComposeMeta {
  device: DeviceType;
  spec: CanvasPaddingSpec;
  rows: number;
  cols: number;
  cell: number;
  usedRows: number;
  mode: SceneLookupKey;
}

export interface ComposeResult {
  placed: PlacedItem[];
  meta: ComposeMeta;
}
