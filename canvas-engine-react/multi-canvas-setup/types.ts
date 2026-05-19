// src/canvas-engine/multi-canvas-setup/types.ts

import type { SceneProfile, SceneProfileContext } from "./sceneProfile";
import type { SceneState } from "../adjustable-rules/sceneState";

export interface SceneRuleSet {
  id: string;
  getProfile: (state: SceneState, context: SceneProfileContext) => SceneProfile;
}
