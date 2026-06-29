import type { ScenePlacementRules } from "../scene-rules/placement-rules";

function positiveModulo(value: number, length: number) {
  return ((value % length) + length) % length;
}

export function resolveRuntimePlacements(
  placements: ScenePlacementRules,
  spotlightIndex: number | undefined
): ScenePlacementRules {
  const runtimePreset = placements.runtimePreset;
  if (!runtimePreset?.entries.length) return placements;
  const entries = runtimePreset.entries;

  if (typeof spotlightIndex !== "number") {
    return entries[0] ?? placements;
  }

  return entries[positiveModulo(spotlightIndex, entries.length)];
}
