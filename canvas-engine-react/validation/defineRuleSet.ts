// src/canvas-engine/validation/defineRuleSet.ts

import type { SceneProfile, SceneProfileContext } from "../multi-canvas-setup/sceneProfile";
import type { SceneState, SceneLookupKey } from "../adjustable-rules/sceneState";
import { isQuestionnaire } from "../adjustable-rules/sceneState";
import { validateSceneProfile } from "./validateSceneProfile";
import type { SceneRuleSet } from "../multi-canvas-setup/types";

function lookupKeyFromState(state: SceneState): SceneLookupKey {
  return isQuestionnaire(state) ? "questionnaire" : state.baseMode;
}

export function defineRuleSet(
  id: string,
  getProfile: (state: SceneState, context: SceneProfileContext) => SceneProfile
): SceneRuleSet {
  return {
    id,
    getProfile: (state: SceneState, context: SceneProfileContext) => {
      const profile = getProfile(state, context);
      validateSceneProfile(id, lookupKeyFromState(state), profile);
      return profile;
    },
  };
}
