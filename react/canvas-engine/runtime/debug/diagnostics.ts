// src/canvas-engine/runtime/debug/diagnostics.ts

import type { EngineFieldItem } from "../engine/field";

export function warnUnknownShape(item: EngineFieldItem) {
  if (import.meta.env.DEV) console.warn("Unknown shape:", item.shape, item);
}

export function reportSchedulerTickError(id: string, err: unknown) {
  console.error(`[engine scheduler] tick failed for "${id}"`, err);
}
