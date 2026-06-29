import type { BackgroundSpec } from "../../backgrounds";
import { rowsByDevice } from "../../canvas-padding/helpers";
import { centerShape } from "../../placement-rules/helpers";
import type { SpotlightSlide } from "../types";

const seaBackground: BackgroundSpec = {
  base: "rgb(48, 42, 51)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(195, 234, 254)" },
      { k: 0.6, rgba: "rgb(234, 248, 255)" },
      { rgba: "rgb(170, 210, 130)", liveBlend: [0.12, 0.06] },
    ] as const,
  },
} as const;

const seaDarkBackground: BackgroundSpec = {
  base: "rgb(43, 40, 55)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(46, 95, 135)" },
      { k: 0.6, rgba: "rgb(75, 96, 110)" },
      { rgba: "rgb(121, 114, 75)", rightRgba: "rgb(116, 96, 76)", liveBlend: [0.12, 0.06] },
    ] as const,
  },
} as const;

const seaPlacement = centerShape("sea", { yK: 0.55});

export const seaSlide = {
  id: "sea",
  shape: "sea",
  background: seaBackground,
  darkBackground: seaDarkBackground,
  padding: rowsByDevice(3, 3, 2),
  placement: seaPlacement,
} as const satisfies SpotlightSlide;
