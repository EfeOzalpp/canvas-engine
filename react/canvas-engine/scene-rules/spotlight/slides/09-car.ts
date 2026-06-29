import type { AmbientParticlesSceneSpec } from "../../ambient-particles";
import type { BackgroundSpec } from "../../backgrounds";
import { uniformRows } from "../../canvas-padding/helpers";
import type { ScenePlacementRules } from "../../placement-rules";
import type { SpotlightSlide } from "../types";

const carBackground: BackgroundSpec = {
  base: "rgb(42, 43, 55)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(181, 213, 236)" },
      { k: 0.6, rgba: "rgb(210, 228, 245)" },
      { k: 0.6, rgba: "rgb(147, 202, 150)", liveBlend: [0.08, 0.12] },
      { rgba: "rgb(140, 205, 183)", liveBlend: [0.08, 0.12] },
    ] as const,
  },
} as const;

const carDarkBackground: BackgroundSpec = {
  base: "rgb(39, 40, 52)",
  overlay: {
    kind: "linear",
    from: { xK: 0.5, yK: 0.0 },
    to: { xK: 0.5, yK: 1.0 },
    stops: [
      { rgba: "rgb(75, 89, 132)" },
      { k: 0.6, rgba: "rgb(59, 98, 135)" },
      { k: 0.6, rgba: "rgb(96, 112, 94)", liveBlend: [0.07, 0.02] },
      { rgba: "rgb(83, 112, 101)", liveBlend: [0.05, 0.02] },
    ] as const,
  },
} as const;

const FLAT_QUOTA = [{ t: 0, pct: 50 }, { t: 1, pct: 50 }];

const carRainAmbientParticles: AmbientParticlesSceneSpec = {
  layers: [
    {
      shape: "rain",
      count: [82, 128],
      xRange: [-0.04, 1.08],
      yRange: [-0.12, 1],
      sizePx: [0.8, 1.2],
      lengthPx: [12, 24],
      slantPx: [4, 10],
      lineWidthPx: [0.7, 1.25],
      speedX: [22, 38],
      speedY: [170, 245],
      color: [
        { color: "rgb(72, 112, 145)", alpha: 0.42 },
        { color: "rgb(55, 94, 128)", alpha: 0.36 },
        { color: "rgb(92, 129, 158)", alpha: 0.32 },
      ],
      seed: 109,
    },
  ],
};

const carDarkRainAmbientParticles: AmbientParticlesSceneSpec = {
  layers: [
    {
      shape: "rain",
      count: [74, 118],
      xRange: [-0.04, 1.08],
      yRange: [-0.12, 1],
      sizePx: [0.8, 1.2],
      lengthPx: [13, 26],
      slantPx: [4, 11],
      lineWidthPx: [0.65, 1.2],
      speedX: [22, 40],
      speedY: [175, 255],
      color: [
        { color: "rgb(155, 198, 235)", alpha: 0.28 },
        { color: "rgb(185, 220, 255)", alpha: 0.22 },
        { color: "rgb(225, 240, 255)", alpha: 0.16 },
      ],
      seed: 113,
    },
  ],
};

const carPlacement: ScenePlacementRules = {
  preset: {
    kind: "zone-communities",
    zones: [
      {
        id: "car",
        band: "ground",
        center: { x: 0.5, y: 0.6 },
        radius: { tiles: 3, xDistort: 2, yDistort: 0.1 },
        shapes: {
          car: { count: { mobile: 5, tablet: 5, laptop: 5 }, quota: FLAT_QUOTA },
        },
      },
    ],
  },
};

export const carSlide = {
  id: "car",
  shape: "car",
  background: carBackground,
  darkBackground: carDarkBackground,
  ambientParticles: carRainAmbientParticles,
  darkAmbientParticles: carDarkRainAmbientParticles,
  padding: uniformRows(3),
  placement: carPlacement,
} as const satisfies SpotlightSlide;
