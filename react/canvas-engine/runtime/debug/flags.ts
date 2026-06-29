// src/canvas-engine/runtime/debug/flags.ts

export interface DebugFlags {
  grid: boolean;
  gridAlpha: number;
}

export const DEBUG_DEFAULT: DebugFlags = {
  grid: false,
  gridAlpha: 1,
};
