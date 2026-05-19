// src/canvas-engine/adjustable-rules/sceneState.ts

// base modes are the main canvas worlds.
export const BASE_MODES = ["start", "city"] as const;
export type BaseMode = (typeof BASE_MODES)[number];

// modifiers layer temporary scene states on top of a base mode.
export const SCENE_MODIFIERS = ["questionnaire"] as const;
export type SceneModifier = (typeof SCENE_MODIFIERS)[number];

// lookup keys index authored rule tables like padding, placements, and backgrounds.
export type SceneLookupKey = BaseMode | "questionnaire";

export interface SceneState {
  baseMode: BaseMode;
  modifiers: ReadonlySet<SceneModifier>;
}

export interface SceneSignals {
  questionnaireOpen: boolean;
}

// turn UI/runtime signals into the scene state consumed by rule sets.
export function resolveSceneState(
  signals: SceneSignals,
  opts?: { baseMode?: BaseMode }
): SceneState {
  const baseMode: BaseMode = opts?.baseMode ?? "start";

  const modifiers = new Set<SceneModifier>();
  if (signals.questionnaireOpen) modifiers.add("questionnaire");

  return { baseMode, modifiers };
}

// small helper for the one modifier we currently support.
export function isQuestionnaire(state: SceneState): boolean {
  return state.modifiers.has("questionnaire");
}

