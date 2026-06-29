import type { RuntimePreset } from "../runtimePreset";

interface AmbientParticleColorStop {
  color: string;
  alpha?: number;
}

export interface AmbientParticleLayerSpec {
  shape?: "dot" | "rain";
  count: number | readonly [number, number];
  xRange?: readonly [number, number];
  yRange?: readonly [number, number];
  sizePx: readonly [number, number];
  lengthPx?: readonly [number, number];
  slantPx?: readonly [number, number];
  lineWidthPx?: readonly [number, number];
  speedX?: readonly [number, number];
  speedY?: readonly [number, number];
  color: string | readonly AmbientParticleColorStop[];
  alpha?: number;
  seed?: number;
}

export interface AmbientParticlesSceneSpec {
  layers: readonly AmbientParticleLayerSpec[];
  runtimePreset?: RuntimePreset<AmbientParticlesSceneSpec | null>;
}
