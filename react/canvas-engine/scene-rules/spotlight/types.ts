import type { AmbientParticlesSceneSpec } from "../ambient-particles";
import type { BackgroundSpec } from "../backgrounds";
import type { CanvasPaddingPolicyByDevice } from "../canvas-padding/types";
import type { FoliageSceneSpec } from "../foliage";
import type { ScenePlacementRuleMap } from "../placement-rules/types";
import type { ShapeName } from "../shapeCatalog";

export interface SpotlightSlide {
  id: string;
  shape: ShapeName;
  background: BackgroundSpec;
  darkBackground: BackgroundSpec;
  ambientParticles?: AmbientParticlesSceneSpec | null;
  darkAmbientParticles?: AmbientParticlesSceneSpec | null;
  foliage?: FoliageSceneSpec | null;
  darkFoliage?: FoliageSceneSpec | null;
  padding: CanvasPaddingPolicyByDevice;
  placement: ScenePlacementRuleMap;
}
