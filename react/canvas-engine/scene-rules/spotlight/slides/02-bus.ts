import type { BackgroundSpec } from "../../backgrounds";
import { rowsByDevice } from "../../canvas-padding/helpers";
import { centerShape } from "../../placement-rules/helpers";
import type { FoliageSceneSpec } from "../../foliage";
import type { SpotlightSlide } from "../types";

const busBackground: BackgroundSpec = {
  base: "rgb(38, 43, 60)",
  overlay: {
    kind: "radial",
    center: { xK: 0.5, yK: 0.5 },
    innerK: 0.08,
    outer: { k: 0.86 },
    stops: [
      { rgba: "rgb(108, 182, 133)" },
      { rgba: "rgb(198, 255, 152)" },
     ] as const,
  },
} as const;

const busDarkBackground: BackgroundSpec = {
  base: "rgb(37, 43, 43)",
  overlay: {
    kind: "radial",
    center: { xK: 0.5, yK: 0.5 },
    innerK: 0.08,
    outer: { k: 0.86 },
    stops: [
      { rgba: "rgb(89, 150, 109)" },
      { rgba: "rgb(149, 149, 92)" },
     ] as const,
  },
} as const;

const busFoliage: FoliageSceneSpec = {
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

const busDarkFoliage: FoliageSceneSpec = {
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

const busPlacement = centerShape("bus");

export const busSlide = {
  id: "bus",
  shape: "bus",
  background: busBackground,
  darkBackground: busDarkBackground,
  foliage: busFoliage,
  darkFoliage: busDarkFoliage,
  padding: rowsByDevice(3, 3, 2),
  placement: busPlacement,
} as const satisfies SpotlightSlide;