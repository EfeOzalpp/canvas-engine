// src/canvas-engine/adjustable-rules/registry.ts

import type { SceneProfile, SceneProfileContext } from "../multi-canvas-setup/sceneProfile";
import type { SceneState, BaseMode } from "./sceneState";
import { isQuestionnaire } from "./sceneState";

import { CANVAS_PADDING }        from './canvas-padding/index';
import { SHAPE_PLACEMENTS } from "./placement-rules/index";
import {
  BACKGROUNDS_CITY,
  BACKGROUNDS_CITY_DARK,
  BACKGROUNDS_LIGHT,
  BACKGROUNDS_START_DARK,
  type BackgroundSpec,
} from "./backgrounds";

import { defineRuleSet } from "../validation/index";

type SceneRules = Pick<SceneProfile, "padding" | "placements">;

// base mode gives us the scene's default layout rules before modifiers are applied.
function baseRulesFor(mode: BaseMode): SceneRules {
  if (mode === "start") {
    return {
      padding: CANVAS_PADDING.start,
      placements: SHAPE_PLACEMENTS.start,
    };
  }

  return {
    padding: CANVAS_PADDING.city,
    placements: SHAPE_PLACEMENTS.city,
  };
}

// questionnaire keeps the base scene but swaps in its own layout constraints.
function applyQuestionnaireOverrides(rules: SceneRules): SceneRules {
  return {
    ...rules,
    padding: CANVAS_PADDING.questionnaire,
    placements: SHAPE_PLACEMENTS.questionnaire,
  };
}

// background is resolved here so the scene profile owns the full visual contract.
function backgroundForState(
  state: SceneState,
  context: SceneProfileContext
): BackgroundSpec {
  if (state.baseMode === "city") {
    return context.darkMode ? BACKGROUNDS_CITY_DARK.city : BACKGROUNDS_CITY.city;
  }

  if (isQuestionnaire(state)) {
    return context.darkMode
      ? BACKGROUNDS_START_DARK.questionnaire
      : BACKGROUNDS_LIGHT.questionnaire;
  }

  return context.darkMode ? BACKGROUNDS_START_DARK.start : BACKGROUNDS_LIGHT.start;
}

// public profile resolver used by host rule sets.
export function resolveProfile(
  state: SceneState,
  context: SceneProfileContext
): SceneProfile {
  const baseRules = baseRulesFor(state.baseMode);
  const rules = isQuestionnaire(state)
    ? applyQuestionnaireOverrides(baseRules)
    : baseRules;

  return {
    ...rules,
    background: backgroundForState(state, context),
  };
}

// host definitions pick one of these rule sets for their canvas.
export const SCENE_RULESETS = {
  intro: defineRuleSet("intro", (state: SceneState, context: SceneProfileContext) =>
    resolveProfile(state, context)
  ),

  city: defineRuleSet("city", (state: SceneState, context: SceneProfileContext) =>
    resolveProfile({ ...state, baseMode: "city" }, context)
  ),
} as const;
