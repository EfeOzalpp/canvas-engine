// src/canvas-engine/adjustable-rules/placement-rules/types.ts

import type { DeviceType } from "../../shared/responsiveness";
import type { ShapeName } from "../shapeCatalog";

export type DeviceCount = Partial<Record<DeviceType, number>>;

export interface PlacementZone {
  verticalK: [top: number, bottom: number]; // vertical fraction of viewport height
  horizontalK?: [left: number, right: number]; // horizontal fraction of viewport width
  count: DeviceCount; // base count per device at allocAvg = 0.5
}

export interface QuotaAnchor {
  t: number;
  pct: number;
}

export interface ShapePlacementRule {
  // 50% means exactly the authored zone count. Default is flat 50%.
  quota?: QuotaAnchor[];
  zones: PlacementZone[];
}

export type ScenePlacementRules = Partial<Record<ShapeName, ShapePlacementRule>>;
