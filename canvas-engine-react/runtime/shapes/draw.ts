import type { PLike } from "../p/makeP";
import type { EngineFieldItem } from "../engine/field";
import type { ShapeRegistry } from "./registry";
import type { RuntimeShapeOptions } from "./types";

export function drawItemFromRegistry(
  registry: ShapeRegistry,
  p: PLike,
  it: EngineFieldItem,
  rEff: number,
  opts: RuntimeShapeOptions
) {
  const fn = registry.get(it.shape);
  if (!fn) {
    if (import.meta.env.DEV) console.warn("Unknown shape:", it.shape, it);
    return;
  }
  fn(p, it, rEff, opts);
}
