import type { SceneLookupKey } from "../sceneState";

// named vertical anchors that let authored backgrounds follow runtime layout
// instead of hardcoding every stop as a raw 0..1 number.
export type BackgroundStopAnchor = "visualHorizon" | "fogHorizon";

// k is the vertical position of a stop. it can be a direct fraction, one of the
// engine anchors, or an anchored value with a small offset for nudging.
export type BackgroundStopK =
  | number
  | BackgroundStopAnchor
  | { anchor: BackgroundStopAnchor; offset?: number };

export interface BackgroundAnchorContext {
  // authored sky/ground split for this canvas instance.
  visualHorizonK: number;
  // runtime fog seam, used when stops should follow the atmospheric blend.
  fogHorizonK: number;
}

export interface RgbaStop {
  k: BackgroundStopK; // vertical position of a color band - k in [0..1], or an engine anchor like k: "fogHorizon" or k: "visualHorizon".
  rgba: string; // color itself
  rightRgba?: string; // optional right-edge color for horizontal blends across this band
  oscK?: { amp: number; hz: number }; // oscillates color stops K value up and down for movement.
  liveBlend?: number | readonly [number, number]; // blends the bg stop with the livAvg lerp stops band
  blendFromPrevious?: boolean; // false creates a hard vertical edge at this stop
  blendToNext?: boolean; // false holds this stop until the next stop instead of interpolating
  fog?: { opacity: number; k?: BackgroundStopK }; // high level fog that samples this stop's color near the given k
}

export interface RadialGradientSpec {
  kind: "radial";
  center: { xK: number; yK: number }; // center point as canvas fractions
  innerK: number; // inner radius as a fraction before the gradient starts moving
  outer: "diag" | { k: number }; // "diag" reaches canvas diagonal, custom k gives authored control
  stops: readonly RgbaStop[];
}

export interface LinearGradientSpec {
  kind: "linear";
  from: { xK: number; yK: number }; // gradient start as canvas fractions
  to: { xK: number; yK: number }; // gradient end as canvas fractions
  stops: readonly RgbaStop[];
}

export interface SolidBackgroundSpec {
  kind: "solid";
  color: string; // css color
}

export interface BackgroundSpec {
  base: string; // used by p.background
  // optional overlay drawn over the base. most scenes use this for the actual
  // sky/ground mood, while base stays as the cheap clear color.
  overlay?: RadialGradientSpec | LinearGradientSpec | SolidBackgroundSpec;
  // stars are authored here because they are part of the sky mood, but runtime
  // still resolves/draws them in the atmosphere pass.
  stars?: {
    count: number | readonly [number, number]; // fixed count or min/max count range
    topBandK: number; // stars live above this vertical band
    minR: number; // smallest star radius
    maxR: number; // largest star radius
    alpha: [number, number] | readonly [[number, number], [number, number]]; // opacity range, optionally split by depth
    flickerHz: [number, number] | readonly [[number, number], [number, number]]; // flicker speed range, optionally split by depth
  };
}

// background lookups are keyed by the scene key the runtime is currently using.
export type BackgroundsByMode = Record<SceneLookupKey, BackgroundSpec>;

// start-host backgrounds only need start/questionnaire. city has its own host.
export type StartBackgroundLookupKey = Exclude<SceneLookupKey, "city">;
export type StartBackgroundsByMode = Record<StartBackgroundLookupKey, BackgroundSpec>;
