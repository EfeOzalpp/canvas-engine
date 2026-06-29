// src/canvas-engine/scene-rules/placement-rules/types.ts

import type { DeviceType } from "../../shared/responsiveness";
import type { ShapeName } from "../shapeCatalog";
import type { RuntimePreset } from "../runtimePreset";

export type DeviceCount = Partial<Record<DeviceType, number>>;

export interface PlacementZone {
  verticalK: [top: number, bottom: number];
  horizontalK?: [left: number, right: number];
  count: DeviceCount;
}

export interface QuotaAnchor {
  t: number;
  pct: number;
}

export interface CenterPlacement {
  count?: DeviceCount;
  xK?: number;
  yK?: number;
  scale?: number;
}

export interface PointPlacement {
  count?: DeviceCount;
  xK: number;
  yK: number;
}

export interface ShapePlacementRule {
  // 50% means exactly the authored zone count. Default is flat 50%.
  quota?: QuotaAnchor[];
  zones?: PlacementZone[];
  center?: CenterPlacement;
  points?: PointPlacement[];
}

export type ScenePlacementRuleMap = Partial<Record<ShapeName, ShapePlacementRule>>;

export type ProceduralZoneBand = "ground" | "sky";

export interface ProceduralZoneShapeRule {
  count: DeviceCount;
  quota?: QuotaAnchor[];
}

export interface ProceduralPlacementZone {
  id: string;
  band: ProceduralZoneBand;
  center: {
    x: number;
    y: number;
  };
  radius: {
    tiles: number;
    shape?: "ellipse" | "rect";
    xDistort?: number;
    yDistort?: number;
    xTiles?: number;
    yTiles?: number;
  };
  shapes: Partial<Record<ShapeName, ProceduralZoneShapeRule>>;
}

export interface ProceduralZonePlacementPreset {
  kind: "zone-communities";
  zones: readonly ProceduralPlacementZone[];
}

export type ScenePlacementRules = ScenePlacementRuleMap & {
  preset?: ProceduralZonePlacementPreset;
  runtimePreset?: RuntimePreset<ScenePlacementRuleMap>;
};
