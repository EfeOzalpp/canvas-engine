import { SPOTLIGHT_SLIDES } from "../spotlight/slides/index";
import type { CanvasPaddingPolicy, CanvasPaddingPolicyByDevice } from "./types";

const SPOTLIGHT_PADDING_VARIANTS = SPOTLIGHT_SLIDES.map(
  (slide) => slide.padding
) as readonly CanvasPaddingPolicyByDevice[];

export const SPOTLIGHT_PADDING: CanvasPaddingPolicy = {
  ...SPOTLIGHT_SLIDES[0].padding,
  runtimePreset: {
    selector: "spotlightIndex",
    entries: SPOTLIGHT_PADDING_VARIANTS,
  },
};
