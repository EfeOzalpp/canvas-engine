import type { BackgroundStopK } from "../backgrounds";
import type { RuntimePreset } from "../runtimePreset";

interface FoliageColorStop {
  color: string;
  alpha?: number;
}

export interface FoliageLayerSpec {
  count: number | readonly [number, number];
  yK: BackgroundStopK | readonly [BackgroundStopK, BackgroundStopK];
  xRange?: readonly [number, number];
  xExclude?: readonly [number, number];
  heightPx: readonly [number, number];
  widthPx?: readonly [number, number];
  color: string | readonly FoliageColorStop[];
  alpha?: number;
  seed?: number;
}

export interface FoliageSceneSpec {
  layers: readonly FoliageLayerSpec[];
  runtimePreset?: RuntimePreset<FoliageSceneSpec | null>;
}
