// Runtime-owned mutable style/input defaults.
// This file should not draw anything or reach into DOM setup.
// It only says what state the engine starts with.

import type { RGB } from "../../shared/math";
import type { ParticleStore } from "../../modifiers/particles";
import { DEBUG_DEFAULT, type DebugFlags } from "../debug";
import type { EngineFieldItem } from "./field";
import type { LiveState } from "./itemLifecycle";
import type { SceneSurfaceLifecycleState } from "./sceneSurfaceLifecycle";
import type { SpotlightSignal } from "../../hooks/signals";
import type { SceneShapeLightSource } from "../../scene-logic/shapeLightSource";

export type EngineShapeLightSource = SceneShapeLightSource;

export interface EngineStyle {
  // Base visual knobs. These are changed through controls.setFieldStyle().
  r: number;
  perShapeScale: Record<string, number>;
  gradientRGBOverride: RGB | null;
  blend: number;
  exposure: number;
  contrast: number;

  // Timing knobs for item enter behavior.
  appearMs: number;
  appearStaggerMs: number;

  // Environment switches passed down into render/fog/shape behavior.
  darkMode: boolean;
  fog: boolean;
  shapeLightSource: EngineShapeLightSource | null;

  // Debug flags are kept with style because they change what gets rendered.
  debug: DebugFlags;
}

// Signal inputs coming from the app. They are not style themselves;
// they are data values that the renderer turns into motion/color.
export interface EngineInputs {
  liveAvg: number;
  spotlight: SpotlightSignal | null;
  hoveredItemId: string | null;
  selectedItemId: string | null;
}

// Field is the current payload of things the canvas should draw.
export interface EngineField { items: EngineFieldItem[]; visible: boolean }

export interface EngineRuntimeState {
  field: EngineField;
  style: EngineStyle;
  inputs: EngineInputs;
}

// Frame-persistent visual effect state owned by one engine instance.
// This is not app data: clearing it resets appear/particle behavior.
export interface EngineEffectState {
  liveStates: Map<string, LiveState>;
  particleStore: ParticleStore;
  sceneSurface: SceneSurfaceLifecycleState;
}

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
  // First field population is the cold path: shape code, masks, and bitmap
  // caches may all be warming. A longer initial stagger spreads that work
  // across frames; runtime refreshes are separately capped in runtime/index.ts.
  appearStaggerMs: 1000,
  darkMode: false,
  fog: true,
  shapeLightSource: null,
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
  return {
    liveAvg: 0.5,
    spotlight: null,
    hoveredItemId: null,
    selectedItemId: null,
  };
}

// Start hidden and empty. The app owns when to provide items and show them.
export function createEngineField(): EngineField {
  return { items: [], visible: false };
}
