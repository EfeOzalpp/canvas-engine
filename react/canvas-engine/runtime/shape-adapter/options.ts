import type { RuntimeShapeOptions } from "./types";

function copyGroup<T extends object>(group: T | undefined): T | undefined {
  return group ? { ...group } : undefined;
}

export function copyRuntimeShapeOptionsInto(
  target: RuntimeShapeOptions,
  source: RuntimeShapeOptions
): RuntimeShapeOptions {
  target.projection = copyGroup(source.projection);
  target.style = copyGroup(source.style);
  target.lifecycle = copyGroup(source.lifecycle);
  target.identity = copyGroup(source.identity);
  target.sprite = copyGroup(source.sprite);
  target.particles = copyGroup(source.particles);
  target.pass = copyGroup(source.pass);
  return target;
}

export function cloneRuntimeShapeOptions(source: RuntimeShapeOptions): RuntimeShapeOptions {
  return copyRuntimeShapeOptionsInto({}, source);
}
