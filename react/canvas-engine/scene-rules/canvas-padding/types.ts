// src/canvas-engine/scene-rules/canvas-padding/types.ts

import type { DeviceType } from "../../shared/responsiveness";
import type { RuntimePreset } from "../runtimePreset";

export interface CanvasPaddingSpec {
  rows: number;
  useTopRatio?: number;
  horizonPos?: number;
  forbidden?: (r: number, c: number, rows: number, cols: number) => boolean;
}

export type CanvasPaddingPolicyByDevice = Record<DeviceType, CanvasPaddingSpec | null>;

export type CanvasPaddingPolicy = CanvasPaddingPolicyByDevice & {
  runtimePreset?: RuntimePreset<CanvasPaddingPolicyByDevice>;
};
