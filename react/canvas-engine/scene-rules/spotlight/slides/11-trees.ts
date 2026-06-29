import type { BackgroundSpec } from "../../backgrounds";
import { uniformRows } from "../../canvas-padding/helpers";
import { centerShape } from "../../placement-rules/helpers";
import type { FoliageSceneSpec } from "../../foliage";
import type { SpotlightSlide } from "../types";

const treesBackground: BackgroundSpec = {
  base: "rgb(38, 47, 44)",
  overlay: {
    kind: "radial",
    center: { xK: 0.5, yK: 0.5 },
    innerK: 0.08,
    outer: { k: 1 },
    stops: [
      { rgba: "rgb(167, 218, 170)", liveBlend: [0.08, 0.12] },
      { rgba: "rgb(153, 229, 158)", liveBlend: [0.08, 0.12] },
      { rgba: "rgb(122, 214, 183)", liveBlend: [0.08, 0.12] },
    ] as const,
  },
} as const;

const treesDarkBackground: BackgroundSpec = {
  base: "rgb(38, 47, 44)",
  overlay: {
    kind: "radial",
    center: { xK: 0.5, yK: 0.5 },
    innerK: 0.08,
    outer: { k: 1 },
    stops: [
      { rgba: "rgb(97, 143, 116)", liveBlend: [0.08, 0.12] },
      { rgba: "rgb(84, 140, 97)", liveBlend: [0.08, 0.12] },
      { rgba: "rgb(62, 111, 90)", liveBlend: [0.08, 0.12] },
    ] as const,
  },
} as const;

const treesFoliage: FoliageSceneSpec = {
  layers: [
    {
      count: [60, 120],
      yK: [0, 1],
      heightPx: [8, 16],
      widthPx: [4, 12],
      color: [
        { color: "#96bf64", alpha: 0.4 },
        { color: "#cebf83", alpha: 0.4 },
        { color: "#71b571", alpha: 0.4 },
      ],
      seed: 32,
    },
  ],
} as const;

const treesDarkFoliage: FoliageSceneSpec = {
  layers: [
    {
      count: [60, 120],
      yK: [0, 1],
      heightPx: [8, 16],
      widthPx: [4, 12],
      color: [
        { color: "#8f613c", alpha: 0.3 },
        { color: "#4a6840", alpha: 0.3 },
        { color: "#2e454a", alpha: 0.3 },
        { color: "#639163", alpha: 0.3 },
      ],
      seed: 32,
    },
  ],
} as const;

const treesPlacement = centerShape("trees", { yK: 0.58 });

export const treesSlide = {
  id: "trees",
  shape: "trees",
  background: treesBackground,
  darkBackground: treesDarkBackground,
  foliage: treesFoliage,
  darkFoliage: treesDarkFoliage,
  padding: uniformRows(2),
  placement: treesPlacement,
} as const satisfies SpotlightSlide;
