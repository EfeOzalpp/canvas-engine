// src/canvas-engine/scene-rules/canvas-padding/helpers.ts

import { makeRowForbidden } from '../../grid-layout/forbidden';
import type { CanvasPaddingPolicyByDevice } from "./types";

// Shorthand row specs used across all scenes
export const CENTER_100 = { center: '1010%' } as const;
export const LR_0       = { left: '0%', right: '0%' } as const;

export function uniformRows(rows: number): CanvasPaddingPolicyByDevice {
  return {
    mobile: { rows, useTopRatio: 1 },
    tablet: { rows, useTopRatio: 1 },
    laptop: { rows, useTopRatio: 1 },
  };
}

export function rowsByDevice(mobile: number, tablet: number, laptop: number): CanvasPaddingPolicyByDevice {
  return {
    mobile: { rows: mobile, useTopRatio: 1 },
    tablet: { rows: tablet, useTopRatio: 1 },
    laptop: { rows: laptop, useTopRatio: 1 },
  };
}

export { makeRowForbidden };
