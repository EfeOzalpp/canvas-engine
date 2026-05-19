// src/canvas-engine/adjustable-rules/placement-rules/index.ts

import type { SceneLookupKey } from "../sceneState";
import type { ScenePlacementRules } from "./types";

export type { ScenePlacementRules, ShapePlacementRule, PlacementZone, QuotaAnchor, DeviceCount } from "./types";
export { forShapes, stableItemId, interpolatePct } from "./helpers";

import { START_PLACEMENTS } from "./start";
import { CITY_PLACEMENTS } from "./city";
import { QUESTIONNAIRE_PLACEMENTS } from "./questionnaire";

export const SHAPE_PLACEMENTS: Record<SceneLookupKey, ScenePlacementRules> = {
  start: START_PLACEMENTS,
  city: CITY_PLACEMENTS,
  questionnaire: QUESTIONNAIRE_PLACEMENTS,
};
