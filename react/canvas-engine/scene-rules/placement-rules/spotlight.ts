import { SPOTLIGHT_SLIDES } from "../spotlight/slides/index";
import type { ScenePlacementRuleMap, ScenePlacementRules } from "./types";

const SPOTLIGHT_PLACEMENT_VARIANTS = SPOTLIGHT_SLIDES.map(
  (slide) => slide.placement
) as readonly ScenePlacementRuleMap[];

export const SPOTLIGHT_PLACEMENTS: ScenePlacementRules = {
  ...SPOTLIGHT_SLIDES[0].placement,
  runtimePreset: {
    selector: "spotlightIndex",
    entries: SPOTLIGHT_PLACEMENT_VARIANTS,
  },
};
