import type { SpotlightSignal } from "../../hooks/signals";
import type { AmbientParticlesSceneSpec } from "../../scene-rules/ambient-particles";
import type { BackgroundSpec } from "../../scene-rules/backgrounds";
import type { FoliageSceneSpec } from "../../scene-rules/foliage";

function positiveModulo(value: number, length: number) {
  return ((value % length) + length) % length;
}

export function resolveRuntimeBackground(
  background: BackgroundSpec | null,
  spotlight: SpotlightSignal | null
): BackgroundSpec | null {
  const runtimePreset = background?.runtimePreset;
  if (!runtimePreset?.entries.length) return background;
  const entries = runtimePreset.entries;

  if (!spotlight) {
    return entries[0] ?? null;
  }

  return entries[positiveModulo(spotlight.index, entries.length)];
}

export function resolveRuntimeAmbientParticles(
  ambientParticles: AmbientParticlesSceneSpec | null,
  spotlight: SpotlightSignal | null
): AmbientParticlesSceneSpec | null {
  const runtimePreset = ambientParticles?.runtimePreset;
  if (!runtimePreset?.entries.length) return ambientParticles;
  const entries = runtimePreset.entries;

  if (!spotlight) {
    return entries[0] ?? null;
  }

  return entries[positiveModulo(spotlight.index, entries.length)] ?? null;
}

export function resolveRuntimeFoliage(
  foliage: FoliageSceneSpec | null,
  spotlight: SpotlightSignal | null
): FoliageSceneSpec | null {
  const runtimePreset = foliage?.runtimePreset;
  if (!runtimePreset?.entries.length) return foliage;
  const entries = runtimePreset.entries;

  if (!spotlight) {
    return entries[0] ?? null;
  }

  return entries[positiveModulo(spotlight.index, entries.length)] ?? null;
}
