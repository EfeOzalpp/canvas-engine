import type { BackgroundSpec } from "../../backgrounds";
import { uniformRows } from "../../canvas-padding/helpers";
import type { ScenePlacementRules } from "../../placement-rules";
import type { SpotlightSlide } from "../types";

const houseBackground: BackgroundSpec = {
  base: "rgb(43, 43, 54)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(214, 242, 255)" },
      { rgba: "rgb(214, 242, 255)" },
      { rgba: "rgb(248, 243, 239)" },
      { k: 0.6, rgba: "rgb(255, 226, 202)", liveBlend: [0.1, 0] },
      { k: 0.6, rgba: "#a9e0a7", rightRgba: "#87dcb7", liveBlend: [0.1, 0.1] },
      { rgba: "#c7ca83", liveBlend: [0.1, 0.1]  },
    ] as const,
  },
} as const;

const houseDarkBackground: BackgroundSpec = {
  base: "rgb(43, 43, 54)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(20, 35, 68)",   rightRgba: "rgb(44, 49, 60)" },
      { rgba: "rgb(49, 84, 126)",  rightRgba: "rgb(67, 71, 93)" },
      { k: 0.65, rgba: "rgb(68, 116, 179)", rightRgba: "rgb(98, 99, 129)"},
      { k: 0.65, rgba: "#757f5c", rightRgba: "#628475", liveBlend: [0.1, 0] },
      { rgba: "#3e4137", liveBlend: [0.1, 0] },
    ] as const,
  },
  stars: {
    count: [16, 24],
    topBandK: 0.6,
    minR: 0.9,
    maxR: 1.6,
    alpha: [[0.5, 1.5], [0.6, 1.6]],
    flickerHz: [[0.42, 0.98], [0.14, 0.34]],
  },
} as const;

const FLAT_QUOTA = [{ t: 0, pct: 50 }, { t: 1, pct: 50 }];

const housePlacement: ScenePlacementRules = {
  preset: {
    kind: "zone-communities",
    zones: [
      {
        id: "house",
        band: "ground",
        center: { x: 0.56, y: 0.7 },
        radius: { tiles: 1, xDistort: 2.5, yDistort: 0.4 },
        shapes: {
          house: { count: { mobile: 5, tablet: 5, laptop: 5 }, quota: FLAT_QUOTA },
        },
      },
    ],
  },
};

export const houseSlide = {
  id: "house",
  shape: "house",
  background: houseBackground,
  darkBackground: houseDarkBackground,
  padding: uniformRows(6),
  placement: housePlacement,
} as const satisfies SpotlightSlide;
