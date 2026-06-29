import type { Anchor } from "../../shared/geometry";

interface Scale2D {
  x?: number;
  y?: number;
  anchor?: Anchor;
}

interface Scale2DOsc {
  mode?: "relative" | "absolute";
  biasX?: number;
  ampX?: number;
  biasY?: number;
  ampY?: number;
  biasAbsX?: number;
  ampAbsX?: number;
  biasAbsY?: number;
  ampAbsY?: number;
  speed?: number;
  phaseX?: number;
  phaseY?: number;
  anchor?: Anchor;
}

interface AppearMod {
  scaleFrom?: number;
  alphaFrom?: number;
  anchor?: Anchor;
  ease?: "linear" | "cubic" | "back";
  backOvershoot?: number;
}

interface TranslateClampX {
  min?: number;
  max?: number;
}
interface TranslateClampY {
  min?: number;
  max?: number;
}

interface TranslateOscX {
  amp?: number;
  speed?: number;
  phase?: number;
}
interface TranslateOscY {
  amp?: number;
  speed?: number;
  phase?: number;
}

export interface ShapeMods {
  // Entry animation envelope. When rootAppearK is present, applyShapeMods uses
  // the standard root appear unless a shape provides overrides or disables it.
  appear?: AppearMod | false;

  scale?: Scale;
  scale2D?: Scale2D;
  sizeOsc?: SizeOsc;
  scale2DOsc?: Scale2DOsc;
  opacityOsc?: OpacityOsc;
  rotation?: Rotation;
  rotationOsc?: RotationOsc;
  saturationOsc?: SaturationOsc;

  translateClampX?: TranslateClampX;
  translateClampY?: TranslateClampY;
  translateOscX?: TranslateOscX;
  translateOscY?: TranslateOscY;
}

interface Scale {
  value?: number;
  anchor?: Anchor;
}

interface SizeOsc {
  speed?: number;
  phase?: number;
  anchor?: Anchor;
  mode?: "relative" | "absolute" | "none";

  bias?: number;
  amp?: number;

  biasAbs?: number;
  ampAbs?: number;
}

interface OpacityOsc {
  amp?: number;
  speed?: number;
  phase?: number;
}

interface Rotation {
  speed?: number;
  phase?: number;
}

interface RotationOsc {
  amp?: number;
  speed?: number;
  phase?: number;
}

interface SaturationOsc {
  amp?: number;
  speed?: number;
  phase?: number;
}

