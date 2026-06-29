import type { RuntimePreset } from "../runtimePreset";

export type BackgroundStopK =
  | number
  | "visualHorizon"
  | { anchor: "visualHorizon"; offset?: number };

export interface BackgroundAnchorContext {
  visualHorizonK: number;
}

export interface RgbaStop {
  // Optional vertical position. Missing stops are distributed between the
  // nearest authored anchors, so background colors can follow the runtime
  // horizon without hand-tuning every band.
  k?: BackgroundStopK;
  rgba: string;
  leftRgba?: string;
  rightRgba?: string;
  oscK?: { amp: number; hz: number };
  liveBlend?: number | readonly [number, number];
  blendFromPrevious?: boolean; // false creates a hard vertical edge at this stop
  blendToNext?: boolean; // false holds this stop until the next stop instead of interpolating
}

export interface RadialGradientSpec {
  kind: "radial";
  center: { xK: number; yK: number };
  innerK: number;
  outer: "diag" | { k: number };
  stops: readonly RgbaStop[];
}

export interface LinearGradientSpec {
  kind: "linear";
  from: { xK: number; yK: number };
  to: { xK: number; yK: number };
  stops: readonly RgbaStop[];
}

interface SolidBackgroundSpec {
  kind: "solid";
  color: string;
}

export interface BackgroundSpec {
  base: string;
  // optional overlay drawn over the base. most scenes use this for the actual
  // sky/ground mood, while base stays as the cheap clear color.
  overlay?: RadialGradientSpec | LinearGradientSpec | SolidBackgroundSpec;
  // Optional runtime-selected backgrounds. The current selector is SpotlightSignal.index,
  // wrapping after the final entry.
  runtimePreset?: RuntimePreset<BackgroundSpec>;
  // stars are authored here because they are part of the sky mood, but runtime
  // still resolves/draws them in the atmosphere pass.
  stars?: {
    count: number | readonly [number, number];
    topBandK: number;
    minR: number;
    maxR: number;
    alpha: [number, number] | readonly [[number, number], [number, number]];
    flickerHz: [number, number] | readonly [[number, number], [number, number]];
  };
}

