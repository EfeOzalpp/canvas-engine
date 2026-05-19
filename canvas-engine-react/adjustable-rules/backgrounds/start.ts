// src/canvas-engine/adjustable-rules/backgrounds/start.ts

import type { BackgroundSpec, StartBackgroundsByMode } from "./types";

// light scene
const START_BACKGROUND: BackgroundSpec = {
  base: "rgb(158, 222, 248)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      // sky
      { k: 0.0,  rgba: "rgba(158, 222, 248)" },
      { k: 0.14, rgba: "rgb(186, 232, 255)" },
      { k: 0.22, rgba: "rgb(214, 242, 255)" },
      { k: 0.28, rgba: "rgb(214, 242, 255)" },
      { k: 0.44, rgba: "rgb(255, 237, 195)" },
      { k: 0.46, rgba: "rgb(255, 222, 195)" },
      { k: "fogHorizon", rgba: "rgb(255, 226, 202)", blendFromPrevious: false, blendToNext: false },
      // ground
      { k: "visualHorizon", rgba: "rgba(108, 214, 184, 0.95)", liveBlend: [0.04, 0.12], blendFromPrevious: false },
      { k: 0.70, rgba: "rgba(82, 184, 146, 0.97)", liveBlend: [0.02, 0.08] },
      { k: 0.96, rgba: "rgba(82, 184, 146, 0.97)" },
      { k: 0.96, rgba: "rgba(120, 156, 102, 1)" },
      { k: 0.98, rgba: "rgba(120, 156, 102, 1)" },
      { k: 0.98,  rgba: "rgb(248, 240, 234)" },
      { k: 1.0,  rgba: "rgb(248, 240, 234)" },
    ] as const,
  },
} as const;

  // questionnaire signal
const QUESTIONNAIRE_BACKGROUND: BackgroundSpec = {
  base: "rgb(158, 222, 248)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { k: 0.0,  rgba: "rgba(158, 222, 248, 1.0)" },
      { k: 0.12, rgba: "rgba(186, 232, 255, 0.99)" },
      { k: 0.32, rgba: "rgba(214, 242, 255, 0.97)" },
      { k: 0.49, rgba: "rgba(255, 236, 166, 0.95)", liveBlend: [0.32, 0.06], oscK: { amp: 0.03, hz: 0.05 } },
      { k: 0.5, rgba: "rgba(108, 214, 184, 0.95)", liveBlend: [0.24, 0.04] },
      { k: 0.7, rgba: "rgba(82, 184, 146, 0.97)", liveBlend: [0.16, 0.2] },
      { k: 1, rgba: "rgba(82, 184, 126, 0.97)", liveBlend: [0.12, 0.0] },
    ] as const,
  },
} as const;

export const BACKGROUNDS_LIGHT: StartBackgroundsByMode = {
  start: START_BACKGROUND,
  questionnaire: QUESTIONNAIRE_BACKGROUND,
} as const;

// dark scene
const START_BACKGROUND_DARK: BackgroundSpec = {
  base: "rgb(18, 26, 62)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { k: 0.0,  rgba: "rgb(20, 35, 68)",   rightRgba: "rgb(44, 49, 60)" },
      { k: 0.16, rgba: "rgb(49, 84, 126)",  rightRgba: "rgb(67, 71, 93)" },
      { k: 0.30, rgba: "rgb(68, 116, 179)", rightRgba: "rgb(98, 99, 129)" },
      { k: 0.42, rgba: "rgb(79, 135, 198)", rightRgba: "rgb(124, 123, 172)" },
      { k: "fogHorizon", rgba: "rgb(102, 158, 255)", rightRgba: "rgb(89, 91, 143)", liveBlend: [0.04, 0.12], blendFromPrevious: false, blendToNext: false },
      // ground
      { k: "visualHorizon", rgba: "rgb(157, 255, 239)", rightRgba: "rgb(237, 222, 137)", liveBlend: [0.06, 0.12], blendFromPrevious: false },
      { k: 0.66,  rgba: "rgb(147, 236, 210)", rightRgba: "rgb(220, 210, 155)", liveBlend: [0.08, 0.10] },
      { k: 0.82,  rgba: "rgb(138, 215, 176)", rightRgba: "rgb(210, 196, 160)", liveBlend: [0.08, 0.12] },
      { k: 0.98,  rgba: "rgb(125, 201, 148)", rightRgba: "rgb(205, 185, 158)", liveBlend: [0.08, 0.10] },
      { k: 0.98,  rgba: "rgba(53, 48, 42, 1)" },
      { k: 1.0,  rgba: "rgba(53, 48, 42, 1)" },
    ] as const,
  },
  stars: {
    count: [32, 54],
    topBandK: 0.35,
    minR: 0.9,
    maxR: 1.6,
    alpha: [[0.5, 1.5], [0.6, 1.6]],
    flickerHz: [[0.42, 0.98], [0.14, 0.34]],
  },
} as const;

  // questionnaire signal
const QUESTIONNAIRE_BACKGROUND_DARK: BackgroundSpec = {
  base: "rgb(18, 26, 62)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      // sky
      { k: 0.0,  rgba: "rgb(59, 68, 116)",  rightRgba: "rgb(12, 13, 45)" },
      { k: 0.20, rgba: "rgb(73, 91, 152)",  rightRgba: "rgb(33, 54, 95)" },
      { k: 0.34, rgba: "rgb(83, 114, 177)", rightRgba: "rgb(49, 92, 136)" },
      { k: 0.45, rgba: "rgb(90, 144, 202)", rightRgba: "rgb(60, 117, 161)" },
      { k: 0.49, rgba: "rgb(154, 230, 255)", rightRgba: "rgb(91, 156, 196)", liveBlend: [0.04, 0.12], blendFromPrevious: false, blendToNext: false },
      // ground
      { k: 0.5, rgba: "rgb(170, 238, 243)", rightRgba: "rgb(210, 236, 169)", liveBlend: [0.06, 0.12], blendFromPrevious: false },
      { k: 0.66,  rgba: "rgb(160, 228, 205)", rightRgba: "rgb(184, 210, 153)", liveBlend: [0.08, 0.10] },
      { k: 0.82,  rgba: "rgb(151, 209, 172)", rightRgba: "rgb(186, 198, 154)", liveBlend: [0.08, 0.12] },
      { k: 0.98,  rgba: "rgb(128, 186, 140)", rightRgba: "rgb(218, 200, 154)", liveBlend: [0.08, 0.10] },
    ] as const,
  },
  stars: {
    count: [36, 56],
    topBandK: 0.36,
    minR: 0.6,
    maxR: 1.2,
    alpha: [[0.5, 1.5], [0.6, 1.6]],
    flickerHz: [[0.42, 0.98], [0.14, 0.34]],
  },
} as const;

export const BACKGROUNDS_START_DARK: StartBackgroundsByMode = {
  start: START_BACKGROUND_DARK,
  questionnaire: QUESTIONNAIRE_BACKGROUND_DARK,
} as const;
