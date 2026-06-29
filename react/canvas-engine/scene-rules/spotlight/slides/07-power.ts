import type { AmbientParticlesSceneSpec } from "../../ambient-particles";
import type { BackgroundSpec } from "../../backgrounds";
import { uniformRows } from "../../canvas-padding/helpers";
import { centerShape } from "../../placement-rules/helpers";
import type { SpotlightSlide } from "../types";

const powerBackground: BackgroundSpec = {
  base: "rgb(43, 43, 54)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(163, 191, 229)" },
      { rgba: "rgb(181, 218, 235)" },
      { k: 0.85, rgba: "rgb(237, 210, 188)", liveBlend: [0.1, 0] },
      { k: 0.85, rgba: "#bce6bb", rightRgba: "#70bf9d", liveBlend: [0.1, 0.1] },
      { rgba: "#bcdd84", liveBlend: [0.1, 0.1]  },
    ] as const,
  },
} as const;

const powerDarkBackground: BackgroundSpec = {
  base: "rgb(35, 42, 50)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(69, 110, 148)", rightRgba: "rgb(64, 59, 106)" },
      { k: 0.85, rgba: "rgb(109, 146, 188)", rightRgba: "rgb(71, 84, 112)" },
      { k: 0.85, rgba: "rgb(120, 175, 130)", rightRgba: "rgb(61, 88, 82)", liveBlend: [0.08, 0.02] },
      { rgba: "rgb(160, 181, 126)", rightRgba: "rgb(89, 132, 105)", liveBlend: [0.08, 0.02] },
    ] as const,
  },
} as const;

const powerAmbientParticles: AmbientParticlesSceneSpec = {
  layers: [
    {
      count: [24, 46],
      xRange: [0, 1],
      yRange: [0, 1],
      sizePx: [1, 2],
      speedX: [24, 48],
      speedY: [-12, 12],
      color: [
        { color: "rgb(158, 190, 209)", alpha: 0.4 },
        { color: "rgb(146, 188, 214)", alpha: 0.5 },
        { color: "rgb(148, 162, 221)", alpha: 0.6 },
      ],
      seed: 31,
    },
    {
      count: [8, 16],
      xRange: [0, 1],
      yRange: [0, 1],
      sizePx: [1.5, 3],
      speedX: [16, 24],
      speedY: [-3, 3],
      color: [
        { color: "rgb(139, 191, 231)", alpha: 0.6 },
        { color: "rgb(119, 209, 225)", alpha: 0.7 },
      ],
      seed: 67,
    },
  ],
};

const powerDarkAmbientParticles: AmbientParticlesSceneSpec = {
  layers: [
    {
      count: [24, 46],
      xRange: [0, 1],
      yRange: [0, 1],
      sizePx: [1, 2],
      speedX: [24, 48],
      speedY: [-12, 12],
      color: [
        { color: "rgb(150, 220, 255)", alpha: 0.4 },
        { color: "rgb(160, 255, 248)", alpha: 0.5 },
        { color: "rgb(200, 210, 255)", alpha: 0.6 },
      ],
      seed: 31,
    },
    {
      count: [8, 16],
      xRange: [0, 1],
      yRange: [0, 1],
      sizePx: [1.5, 3],
      speedX: [16, 24],
      speedY: [-3, 3],
      color: [
        { color: "rgb(91, 174, 131)", alpha: 0.6 },
        { color: "rgb(98, 190, 205)", alpha: 0.7 },
      ],
      seed: 67,
    },
  ],
};

const powerPlacement = centerShape("power");

export const powerSlide = {
  id: "power",
  shape: "power",
  background: powerBackground,
  darkBackground: powerDarkBackground,
  ambientParticles: powerAmbientParticles,
  darkAmbientParticles: powerDarkAmbientParticles,
  padding: uniformRows(4),
  placement: powerPlacement,
} as const satisfies SpotlightSlide;
