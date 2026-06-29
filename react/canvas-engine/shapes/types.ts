import type { CanvasDrawSurface } from "../shared/canvas";
import type {
  GridFootprint,
  ProjectionContext,
  RGB,
  SceneLightContext,
  ShapeRenderPassOptions,
} from "../modifiers/index";
import type { ParticleStore } from "../modifiers/particles";

export type ShapeCanvas = CanvasDrawSurface;
export type ShapeSeed = string | number;

export type ShapePalette = Record<string, unknown>;

export interface ShapeProjectionOptions extends ProjectionContext {
  footprint?: GridFootprint;
  usedRows?: number;
}

export interface ShapeStyleOptions<Palette extends ShapePalette = ShapePalette> {
  palette?: Palette;
  darkMode?: boolean;
  exposure?: number;
  contrast?: number;
  alpha?: number;
  liveAvg?: number;
  blend?: number;
  gradientRGB?: RGB | null;
  // Runtime creates the scene light context; shapes decide how their own
  // surfaces respond to it through light sampling and paint helpers.
  lightCtx?: SceneLightContext | null;
}

export interface ShapeLifecycleOptions {
  timeMs?: number;
  dtSec?: number;
  rootAppearK?: number;
  hoverK?: number;
  selectK?: number;
}

export interface ShapeIdentityOptions {
  seed?: ShapeSeed;
  seedKey?: ShapeSeed;
  shapeOccurrenceIndex?: number;
}

export interface ShapeSpriteOptions {
  allowUpscale?: boolean;
  fitToFootprint?: boolean;
  spriteMode?: boolean;
  coreScaleMult?: number;
  pixelScale?: number;
  particlePixelScale?: number;
  disableParticleDepthTint?: boolean;
}

export interface ShapeParticleOptions {
  particleStore?: ParticleStore;
}

export interface ShapeOptionGroups<Palette extends ShapePalette = ShapePalette> {
  projection?: ShapeProjectionOptions;
  style?: ShapeStyleOptions<Palette>;
  lifecycle?: ShapeLifecycleOptions;
  identity?: ShapeIdentityOptions;
  sprite?: ShapeSpriteOptions;
  particles?: ShapeParticleOptions;
  pass?: ShapeRenderPassOptions;
}

export type ShapeDrawOptions<Palette extends ShapePalette = ShapePalette> =
  ShapeOptionGroups<Palette>;

export type ShapeDrawFn<Options extends ShapeDrawOptions = ShapeDrawOptions> = (
  p: ShapeCanvas,
  cx: number,
  cy: number,
  r: number,
  opts?: Options
) => void;
