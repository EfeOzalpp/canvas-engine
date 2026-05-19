import type { PLike } from "../runtime/p/makeP";
import type {
  GridFootprint,
  ProjectionContext,
  RGB,
  SceneLightContext,
} from "../modifiers/index";

export type ShapeCanvas = PLike;
export type ShapeSeed = string | number;
export type ShapePalette = Record<string, unknown>;

export interface ShapeDrawOptions<Palette extends ShapePalette = ShapePalette> extends ProjectionContext {
  palette?: Palette;
  paletteTheme?: unknown;
  darkMode?: boolean;
  exposure?: number;
  contrast?: number;
  alpha?: number;
  liveAvg?: number;
  blend?: number;
  gradientRGB?: RGB | null;
  lightCtx?: SceneLightContext | null;
  timeMs?: number;
  deltaSec?: number;
  dtSec?: number;
  dtMs?: number;
  rootAppearK?: number;
  seed?: ShapeSeed;
  seedKey?: ShapeSeed;
  itemId?: ShapeSeed;
  shapeOccurrenceIndex?: number;
  footprint?: GridFootprint;
  usedRows?: number;
  allowUpscale?: boolean;
  fitToFootprint?: boolean;
  spriteMode?: boolean;
  coreScaleMult?: number;
  pixelScale?: number;
  particlePixelScale?: number;
}

export type ShapeDrawFn<Options extends ShapeDrawOptions = ShapeDrawOptions> = (
  p: ShapeCanvas,
  cx: number,
  cy: number,
  r: number,
  opts?: Options
) => void;
