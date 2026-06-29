export type BackgroundStopAnchor = "horizon";

// k is authored as a percentage (0–100).
// Can be a raw number, a named anchor, or an anchor with a % offset.
export type StopK =
  | number
  | BackgroundStopAnchor
  | { anchor: BackgroundStopAnchor; offset?: number };

// Resolved anchor values supplied at draw time.
export interface AnchorContext {
  horizon: number; // 0–100
}

export interface GradientStop {
  k?: StopK;            // % position along gradient axis; omit to auto-distribute
  rgba: string;          // left / primary color
  rightRgba?: string;    // optional right-edge color — horizontal blend across this band
  holdToNext?: boolean;  // true = hard edge, hold this color until the next stop
}

export interface LinearGradientSpec {
  kind: "linear";
  stops: readonly GradientStop[];
}

export interface RadialGradientSpec {
  kind: "radial";
  center: { xPct: number; yPct: number }; // canvas-relative %
  innerPct: number;
  outer: "diag" | { pct: number };
  stops: readonly GradientStop[];
}

export interface SolidOverlaySpec {
  kind: "solid";
  color: string;
}

export type OverlaySpec = LinearGradientSpec | RadialGradientSpec | SolidOverlaySpec;

export interface StarSpec {
  count: number | readonly [number, number];
  topBandPct: number;
  minR: number;
  maxR: number;
  alpha: readonly [number, number];
  flickerHz: readonly [number, number];
}

export interface BackgroundSpec {
  base: string;
  overlay?: OverlaySpec;
  stars?: StarSpec;
}