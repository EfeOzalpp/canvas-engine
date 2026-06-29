import type { BackgroundSpec } from "../../backgrounds";
import { uniformRows } from "../../canvas-padding/helpers";
import { centerShape } from "../../placement-rules/helpers";
import type { SpotlightSlide } from "../types";

const sunBackground: BackgroundSpec = {
  base: "rgb(50, 43, 50)",
  overlay: {
    kind: "radial",
    center: { xK: 0.5, yK: 0.5 },
    innerK: 0.08,
    outer: { k: 1 },
    stops: [
      { rgba: "rgb(255, 252, 228)", liveBlend: [0.08, 0.02]  },
      { rgba: "rgb(181, 237, 247)" },
      { rgba: "rgb(133, 184, 221)" },
      { rgba: "rgb(151, 178, 240)" },
    ] as const,
  },
} as const;

const sunDarkBackground: BackgroundSpec = {
  base: "rgb(45, 40, 52)",
  overlay: {
    kind: "radial",
    center: { xK: 0.5, yK: 0.5 },
    innerK: 0.08,
    outer: { k: 1 },
    stops: [
      { rgba: "rgb(105, 116, 155)", liveBlend: [0.04, 0.1]  },
      { rgba: "rgb(30, 31, 86)", liveBlend: [0.04, 0.1] },
    ] as const,
  },
  stars: {
    count: [24, 42],
    topBandK: 1,
    minR: 0.65,
    maxR: 2,
    alpha: [[0.3, 0.76], [0.38, 0.96]],
    flickerHz: [[0.24, 0.58], [0.1, 0.22]],
  },
} as const;

const sunPlacement = centerShape("sun");

export const sunSlide = {
  id: "sun",
  shape: "sun",
  background: sunBackground,
  darkBackground: sunDarkBackground,
  darkAmbientParticles: null,
  padding: uniformRows(3),
  placement: sunPlacement,
} as const satisfies SpotlightSlide;
