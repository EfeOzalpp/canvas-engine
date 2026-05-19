// src/canvas-engine/adjustable-rules/backgrounds/city.ts

import type { BackgroundsByMode, BackgroundSpec } from "./types";

// light scene
const CITY_BACKGROUND: BackgroundSpec = {
  base: "rgb(158, 222, 248)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { k: 0.0,  rgba: "rgba(158, 222, 248, 1.0)" },
      { k: 0.20, rgba: "rgba(186, 232, 255, 0.99)", oscK: { amp: 0.03, hz: 0.015 } },
      { k: 0.40, rgba: "rgba(214, 242, 255, 0.97)" },
      { k: 0.52, rgba: "rgba(255, 236, 166, 0.95)" },
      { k: 0.56, rgba: "rgba(108, 214, 184, 0.95)", liveBlend: [0.04, 0.12] },
      { k: 0.75, rgba: "rgba(82, 184, 146, 0.97)", liveBlend: [0.02, 0.08] },
      { k: 0.96, rgba: "rgba(82, 184, 146, 0.97)" },
      { k: 0.96, rgba: "rgba(120, 156, 102, 1)" },
      { k: 0.98, rgba: "rgba(120, 156, 102, 1)" },
      { k: 0.98, rgba: "rgb(248, 240, 234)" },
      { k: 1.0,  rgba: "rgb(248, 240, 234)" },
    ] as const,
  },
} as const;

export const BACKGROUNDS_CITY: BackgroundsByMode = {
  start: CITY_BACKGROUND,
  questionnaire: CITY_BACKGROUND,
  city: CITY_BACKGROUND,
} as const;

// dark scene
const CITY_BACKGROUND_DARK: BackgroundSpec = {
  base: "rgb(18, 26, 62)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { k: 0.0,  rgba: "rgba(18, 26, 62, 1.0)" },
      { k: 0.20, rgba: "rgba(41, 57, 113, 0.98)", oscK: { amp: 0.03, hz: 0.015 } },
      { k: 0.40, rgba: "rgba(36, 60, 116, 0.95)" },
      { k: 0.47, rgba: "rgba(64, 118, 165, 0.93)" },
      { k: 0.58, rgba: "rgba(105, 157, 167, 0.95)", liveBlend: [0.04, 0.12] },
      { k: 0.78, rgba: "rgba(76, 129, 116, 0.97)", liveBlend: [0.02, 0.08] },
      { k: 0.98, rgba: "rgba(84, 120, 103, 0.97)" },
      { k: 0.98, rgba: "rgba(41, 40, 39, 1)" },
      { k: 1.0,  rgba: "rgba(41, 40, 39, 1)" },
    ] as const,
  },
  stars: {
    count: [24, 36],
    topBandK: 0.3,
    minR: 0.9,
    maxR: 2.1,
    alpha: [[0.5, 1.5], [0.6, 1.6]],
    flickerHz: [[0.42, 0.98], [0.14, 0.34]],
  },
} as const;

export const BACKGROUNDS_CITY_DARK: BackgroundsByMode = {
  start: CITY_BACKGROUND_DARK,
  questionnaire: CITY_BACKGROUND_DARK,
  city: CITY_BACKGROUND_DARK,
} as const;
