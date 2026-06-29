import type { PLike } from "../p/makeP";
import type { EngineFieldItem } from "../engine/field";
import { warnUnknownShape } from "../debug";
import { shapePass } from "../../shapes/options";
import { supportsShapeRenderPass, type ShapeRegistry } from "./registry";
import type { RuntimeShapeOptions } from "./types";

export function drawItemFromRegistry(
  registry: ShapeRegistry,
  p: PLike,
  it: EngineFieldItem,
  rEff: number,
  opts: RuntimeShapeOptions
): boolean {
  const fn = registry.get(it.shape);
  if (!fn) {
    warnUnknownShape(it);
    return false;
  }
  if (!supportsShapeRenderPass(fn, shapePass(opts).renderPass ?? "color")) return false;
  fn(p, it, rEff, opts);
  return true;
}
