// Helper for adding the shared entry animation envelope to a shape modifier config.
import type { ShapeMods, Anchor } from "./types";

type Ease = 'linear' | 'cubic' | 'back';

export interface AppearParams {
  scaleFrom?: number;     // default 0
  alphaFrom?: number;     // default 0
  anchor?: Anchor;        // default 'bottom-center'
  ease?: Ease;            // default 'cubic'
  backOvershoot?: number; // default 1.6
}

// Merge an appear envelope onto existing mods without forcing every shape to repeat defaults.
export function withAppear(mods: ShapeMods | undefined, params?: AppearParams): ShapeMods {
  const appear = {
    scaleFrom: 0,
    alphaFrom: 0,
    anchor: 'bottom-center' as Anchor,
    ease: 'cubic' as Ease,
    backOvershoot: 1.6,
    ...(params ?? {}),
  };
  return { ...(mods ?? {}), appear };
}
