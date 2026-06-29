import { SPOTLIGHT_SLIDES } from "../spotlight/slides/index";
import type { BackgroundSpec } from "./types";

const SPOTLIGHT_BACKGROUND_VARIANTS = SPOTLIGHT_SLIDES.map(
  (slide) => slide.background
) as readonly BackgroundSpec[];

const SPOTLIGHT_DARK_BACKGROUND_VARIANTS = SPOTLIGHT_SLIDES.map(
  (slide) => slide.darkBackground
) as readonly BackgroundSpec[];

const SPOTLIGHT_BACKGROUND: BackgroundSpec = {
  ...SPOTLIGHT_SLIDES[0].background,
  runtimePreset: {
    selector: "spotlightIndex",
    entries: SPOTLIGHT_BACKGROUND_VARIANTS,
  },
} as const;

export const BACKGROUNDS_SPOTLIGHT: Record<"spotlight", BackgroundSpec> = {
  spotlight: SPOTLIGHT_BACKGROUND,
} as const;

const SPOTLIGHT_BACKGROUND_DARK: BackgroundSpec = {
  ...SPOTLIGHT_SLIDES[0].darkBackground,
  runtimePreset: {
    selector: "spotlightIndex",
    entries: SPOTLIGHT_DARK_BACKGROUND_VARIANTS,
  },
} as const;

export const BACKGROUNDS_SPOTLIGHT_DARK: Record<"spotlight", BackgroundSpec> = {
  spotlight: SPOTLIGHT_BACKGROUND_DARK,
} as const;
