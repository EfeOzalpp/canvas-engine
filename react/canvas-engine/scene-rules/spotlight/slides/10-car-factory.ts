import type { BackgroundSpec } from "../../backgrounds";
import { uniformRows } from "../../canvas-padding/helpers";
import { centerShape } from "../../placement-rules/helpers";
import type { SpotlightSlide } from "../types";

const carFactoryBackground: BackgroundSpec = {
  base: "rgb(44, 39, 48)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(140, 211, 255)", rightRgba: "rgb(145, 157, 215)" },
      { k: 0.75, rgba: "rgb(255, 231, 231)" },
      { k: 0.75, rgba: "rgb(212, 189, 183)", rightRgba: "rgb(189, 173, 151)", liveBlend: [0.14, 0.08] },
      { rgba: "rgb(185, 185, 185)", liveBlend: [0.08, 0.02] },
    ] as const,
  },
} as const;

const carFactoryDarkBackground: BackgroundSpec = {
  base: "rgb(44, 39, 48)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(47, 94, 124)", rightRgba: "rgb(63, 74, 129)" },
      { k: 0.75, rgba: "rgb(146, 123, 91)" },
      { k: 0.75, rgba: "rgb(102, 90, 87)", rightRgba: "rgb(79, 72, 62)", liveBlend: [0.14, 0.08] },
      { rgba: "rgb(91, 91, 91)", liveBlend: [0.08, 0.02] },
    ] as const,
  },
} as const;

const carFactoryPlacement = centerShape("carFactory", {yK: 0.52} );

export const carFactorySlide = {
  id: "carFactory",
  shape: "carFactory",
  background: carFactoryBackground,
  darkBackground: carFactoryDarkBackground,
  padding: uniformRows(3),
  placement: carFactoryPlacement,
} as const satisfies SpotlightSlide;
