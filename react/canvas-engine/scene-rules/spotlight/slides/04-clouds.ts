import type { BackgroundSpec } from "../../backgrounds";
import { uniformRows } from "../../canvas-padding/helpers";
import { centerShape } from "../../placement-rules/helpers";
import type { SpotlightSlide } from "../types";

const cloudsBackground: BackgroundSpec = {
  base: "rgb(42, 45, 58)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(137, 180, 220)" },
      { rgba: "rgb(178, 221, 246)" },
    ] as const,
  },
} as const;

const cloudsDarkBackground: BackgroundSpec = {
  base: "rgb(43, 40, 55)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(25, 52, 91)", rightRgba: "rgb(44, 62, 97)", liveBlend: [0.12, 0.06] },
      { rgba: "rgb(49, 83, 116)", rightRgba: "rgb(65, 69, 118)" },
    ] as const,
  },
  stars: {
    count: [18, 30],
    topBandK: 0.95,
    minR: 0.7,
    maxR: 1.3,
    alpha: [[0.36, 0.92], [0.44, 1.12]],
    flickerHz: [[0.3, 0.72], [0.12, 0.28]],
  },
} as const;

const cloudsPlacement = centerShape("clouds", { yK: 0.62 });

export const cloudsSlide = {
  id: "clouds",
  shape: "clouds",
  background: cloudsBackground,
  darkBackground: cloudsDarkBackground,
  padding: uniformRows(3),
  placement: cloudsPlacement,
} as const satisfies SpotlightSlide;
