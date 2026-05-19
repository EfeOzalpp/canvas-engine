import type { SceneLookupKey } from "../../adjustable-rules/sceneState";
import type { CanvasPaddingSpec } from "../../adjustable-rules/canvas-padding";
import type { BackgroundSpec } from "../../adjustable-rules/backgrounds";
import type { EngineLayoutMode } from "../platform/mount";
import type { DprMode } from "../platform/viewport";
import type { CanvasBounds } from "../../multi-canvas-setup/hostDefs";
import type { ShapeRegistry } from "../shapes/registry";
import type { DebugFlags } from "../debug/flags";
import type { RGB } from "../../modifiers/index";
import type { EngineFieldItem } from "./field";

export type { EngineFieldItem } from "./field";

export interface EngineInputsPayload {
  liveAvg?: number;
}

// Style patch accepted from outside the runtime.
// The full default style lives in engine/state.ts; this is only the public update shape.
export interface EngineFieldStyle {
  r?: number;
  gradientRGBOverride?: RGB | null;
  blend?: number;
  perShapeScale?: Record<string, number>;
  exposure?: number;
  contrast?: number;
  appearMs?: number;
  exitMs?: number;
  darkMode?: boolean;
  isRealMobile?: boolean;
  fog?: boolean;
  debug?: Partial<DebugFlags>;
}

export interface EngineControls {
  // inbound signals provided by outside of engine to drive movement on shapes
  setInputs: (args?: EngineInputsPayload) => void;

  // field payload
  setFieldItems: (nextItems?: EngineFieldItem[]) => void;
  setFieldStyle: (args?: EngineFieldStyle) => void;
  setFieldVisible: (v: boolean) => void;

  // mode/policy inputs to runtime
  setSceneMode: (mode: SceneLookupKey) => void;

  // Optional escape hatches: if caller already resolved these, runtime uses them.
  setPaddingSpec: (spec: CanvasPaddingSpec | null) => void;
  setBackgroundSpec: (spec: BackgroundSpec | null) => void;

  setVisible: (v: boolean) => void;

  stop: () => void;

  readonly canvas: HTMLCanvasElement | null;
}

export interface StartCanvasEngineOpts {
  mount?: string;
  onReady?: (controls: EngineControls) => void;
  dprMode?: DprMode;
  zIndex?: number;
  layout?: EngineLayoutMode;
  bounds?: CanvasBounds;
  shapeRegistry?: ShapeRegistry;
  fpsCap?: number;
  initialDarkMode?: boolean;
}
