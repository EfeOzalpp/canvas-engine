// src/canvas-engine/adjustable-rules/resolvePadding.ts

import { deviceType, type DeviceType } from "../shared/responsiveness";
import type { CanvasPaddingSpec } from './canvas-padding/index';

// pick the padding spec that matches the current rule width/device band.
export function resolvePaddingSpec(
  w: number,
  paddingByDevice: Record<DeviceType, CanvasPaddingSpec | null >
): CanvasPaddingSpec {
  const band = deviceType(w);
  const spec = paddingByDevice[band];
  if (!spec) throw new Error(`Missing padding spec for band: ${band}. Keys: ${Object.keys(paddingByDevice).join(", ")}`);
  return spec;
}

