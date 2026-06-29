import type { BackgroundSpec } from "../../backgrounds";
import { uniformRows } from "../../canvas-padding/helpers";
import { centerShape } from "../../placement-rules/helpers";
import type { SpotlightSlide } from "../types";

const snowBackground: BackgroundSpec = {
  base: "rgb(40, 44, 58)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(129, 178, 227)" },
      { rgba: "rgb(190, 194, 204)", liveBlend: [0.10, 0.08] },
    ] as const,
  },
} as const;

const snowDarkBackground: BackgroundSpec = {
  base: "rgb(34, 39, 54)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(65, 97, 130)" },
      { rgba: "rgb(53, 71, 110)", liveBlend: [0.10, 0.08] },
    ] as const,
  },
  stars: {
    count: [16, 24],
    topBandK: 0.95,
    minR: 0.7,
    maxR: 1.3,
    alpha: [[0.36, 0.92], [0.44, 1.12]],
    flickerHz: [[0.3, 0.72], [0.12, 0.28]],
  },
} as const;

const snowPlacement = centerShape("snow", {yK: 0.66});

export const snowSlide = {
  id: "snow",
  shape: "snow",
  background: snowBackground,
  darkBackground: snowDarkBackground,
  padding: uniformRows(3),
  placement: snowPlacement,
} as const satisfies SpotlightSlide;
