// src/canvas-engine/multi-canvas-setup/hostDefs.ts

import { SCENE_RULESETS } from "../adjustable-rules/registry";
import type { SceneRuleSet } from "./types";
import type { BaseMode } from "../adjustable-rules/sceneState";
import type { DprMode } from "../runtime/platform/viewport";

// give the canvas the size you want
export type CanvasBounds =
  | { kind: "viewport" }
  | { kind: "parent" }
  | { kind: "fixed"; w: number; h: number };

export interface HostSignals {
  questionnaireOpen?: boolean;
}

// Base shape
interface HostDefBase {
  mount: string;
  zIndex: number;
  dprMode: DprMode;
  fpsCap?: number;
  canvasDimensions?: CanvasBounds | ((signals: HostSignals) => CanvasBounds);
  stopOnOpen?: readonly string[];
  scene?: {
    baseMode?: BaseMode;   // "start" | "city"
    ruleset: SceneRuleSet; // getProfile(SceneState, SceneProfileContext)
  };
}

const defineHosts = <T extends Record<string, HostDefBase>>(t: T) => t;

export const HOST_DEFS = defineHosts({
  start: {
    mount: "#canvas-root",
    zIndex: 2,
    dprMode: "cap1_5",
    canvasDimensions: { kind: "parent" },
    scene: { baseMode: "start", ruleset: SCENE_RULESETS.intro },
  },

  city: {
    mount: "#city-canvas-root",
    zIndex: 60,
    dprMode: "fixed1",
    stopOnOpen: ["start"],
    canvasDimensions: { kind: "viewport" },
    scene: { baseMode: "city", ruleset: SCENE_RULESETS.city },
  },
} as const);

// Now it's safe to derive HostId
export type HostId = keyof typeof HOST_DEFS;

// Public type: tighten stopOnOpen for consumers
export type HostDef = Omit<HostDefBase, "stopOnOpen"> & {
  stopOnOpen?: readonly HostId[];
};
