// src/canvas-engine/validation/defineRuleSet.ts

import type { SceneState } from "../scene-state";
import type { SceneProfile, SceneProfileContext, SceneRuleSet } from "../scene-rules/profile";
import { validateSceneProfile } from "./validateSceneProfile";

export function defineRuleSet(
  id: string,
  getProfile: (state: SceneState, context: SceneProfileContext) => SceneProfile
): SceneRuleSet {
  return {
    id,
    getProfile: (state: SceneState, context: SceneProfileContext) => {
      const profile = getProfile(state, context);
      validateSceneProfile(id, state.lookupKey, profile);
      return profile;
    },
  };
}
