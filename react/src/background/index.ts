export type {
  BackgroundSpec,
  GradientStop,
  LinearGradientSpec,
  RadialGradientSpec,
  SolidOverlaySpec,
  OverlaySpec,
  StarSpec,
  StopK,
  BackgroundStopAnchor,
  AnchorContext,
  ResolvedStop,
} from "./core";

export { resolveStops } from "./core";
export { drawBackground } from "./draw";

import "./configs";