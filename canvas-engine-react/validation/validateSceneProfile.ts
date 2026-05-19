// src/canvas-engine/validation/validateSceneProfile.ts

import type { SceneProfile } from "../multi-canvas-setup/sceneProfile";
import type { SceneLookupKey } from "../adjustable-rules/sceneState";
import { invariant } from "./invariant";

export function validateSceneProfile(id: string, mode: SceneLookupKey, profile: SceneProfile) {
  invariant(!!profile, `[${id}] SceneProfile is missing`);
  invariant(!!profile.padding, `[${id}] missing "padding" on SceneProfile`);
  invariant(!!profile.placements, `[${id}] missing "placements" on SceneProfile`);
  invariant(!!profile.background, `[${id}] missing "background" on SceneProfile`);
  invariant(typeof mode === "string", `[${id}] invalid mode`);
}
