export interface FogColor {
  r: number;
  g: number;
  b: number;
}

export interface FogGradientStop {
  k: number;
  color: FogColor;
}

export interface FogLightGradientSpec {
  edgeColor?: FogColor;
  leftEdgeColor?: FogColor;
  rightEdgeColor?: FogColor;
  innerRadiusK?: number;
}

export interface FogModeSpec {
  color?: FogColor;
  layerAlpha?: number;
  skyGradient?: FogLightGradientSpec | readonly FogGradientStop[] | null;
  groundGradient?: FogLightGradientSpec | readonly FogGradientStop[] | null;
}

export interface FogSceneSpec {
  lightRadiusK?: number;
  sky?: FogModeSpec | null;
  ground?: FogModeSpec | null;
}
