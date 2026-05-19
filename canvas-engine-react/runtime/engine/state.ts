// Runtime-owned mutable state and its defaults.
// This file should not draw anything or reach into DOM setup.
// It only says what state the engine starts with.

import type { EngineFieldItem } from "./field";
import type { RGB } from "../../modifiers/index";

import type { GridCacheState } from "../geometry/gridCache";
import type { LiveState } from "./itemLifecycle";
import type { Ghost } from "../render/ghosts";
import type { DebugFlags } from "../debug/flags";
import { DEBUG_DEFAULT } from "../debug/flags";

export interface EngineStyle {
  // Base visual knobs. These are changed through controls.setFieldStyle().
  r: number;
  perShapeScale: Record<string, number>;
  gradientRGBOverride: RGB | null;
  blend: number;
  exposure: number;
  contrast: number;

  // Timing knobs for item enter/exit behavior.
  appearMs: number;
  exitMs: number;

  // Environment switches passed down into render/fog/shape behavior.
  darkMode: boolean;
  isRealMobile: boolean;
  fog: boolean;

  // Debug flags are kept with style because they change what gets rendered.
  debug: DebugFlags;
}

// Signal inputs coming from the app. They are not style themselves;
// they are data values that the renderer turns into motion/color.
export interface EngineInputs { liveAvg: number }

// Field is the current payload of things the canvas should draw.
export interface EngineField { items: EngineFieldItem[]; visible: boolean }

// Baseline style. Factories below clone nested objects so engine instances
// do not accidentally share mutable defaults.
export const ENGINE_STYLE_DEFAULT: EngineStyle = {
  r: 11,
  perShapeScale: {},
  gradientRGBOverride: null,
  blend: 0.5,
  // Most shape palettes are clamped into fairly soft midtones before exposure is applied.
  // A slight default lift keeps the world from reading muddy under fog and scene overlays.
  exposure: 1.08,
  contrast: 1.03,
  appearMs: 300,
  exitMs: 300,
  darkMode: false,
  isRealMobile: false,
  fog: true,
  debug: { ...DEBUG_DEFAULT },
};

export function createEngineStyle(initialDarkMode?: boolean): EngineStyle {
  return {
    ...ENGINE_STYLE_DEFAULT,
    perShapeScale: { ...ENGINE_STYLE_DEFAULT.perShapeScale },
    debug: { ...ENGINE_STYLE_DEFAULT.debug },
    darkMode: typeof initialDarkMode === "boolean" ? initialDarkMode : ENGINE_STYLE_DEFAULT.darkMode,
  };
}

// Start with a neutral signal. App controls can push real values later.
export function createEngineInputs(): EngineInputs {
  return { liveAvg: 0.5 };
}

// Start hidden and empty. The app owns when to provide items and show them.
export function createEngineField(): EngineField {
  return { items: [], visible: false };
}

// Full engine state shape used by lower-level helpers that need the complete runtime bag.
// Most files should prefer smaller local parameter interfaces instead of taking this whole object.
export interface EngineState {
  style: EngineStyle;
  inputs: EngineInputs;
  field: EngineField;

  paletteCache: { lastU: number; gradientRGB: { r: number; g: number; b: number } | null };
  gridCache: GridCacheState;

  liveStates: Map<string, LiveState>;
  ghosts: Ghost[];
}
