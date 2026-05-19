// src/canvas-engine/adjustable-rules/backgrounds/index.ts

// unlike backgrounds/types.ts this is what outside files import from.
export type {
  RgbaStop,
  BackgroundStopAnchor,
  BackgroundStopK,
  BackgroundAnchorContext,
  RadialGradientSpec,
  LinearGradientSpec,
  SolidBackgroundSpec,
  BackgroundSpec,
  BackgroundsByMode,
  StartBackgroundLookupKey,
  StartBackgroundsByMode,
} from "./types";

export { BACKGROUNDS_LIGHT, BACKGROUNDS_START_DARK } from "./start";
export { BACKGROUNDS_CITY, BACKGROUNDS_CITY_DARK } from "./city";

import type { BackgroundsByMode } from "./types";
import { BACKGROUNDS_LIGHT, BACKGROUNDS_START_DARK } from "./start";
import { BACKGROUNDS_CITY, BACKGROUNDS_CITY_DARK } from "./city";

// Full-scene lookup used by runtime when no host-specific background is passed.
export const BACKGROUNDS: BackgroundsByMode = {
  ...BACKGROUNDS_LIGHT,
  city: BACKGROUNDS_CITY.city,
};

// Dark variant of the full-scene lookup.
export const BACKGROUNDS_DARK: BackgroundsByMode = {
  ...BACKGROUNDS_START_DARK,
  city: BACKGROUNDS_CITY_DARK.city,
};
