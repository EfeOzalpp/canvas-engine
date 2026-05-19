export interface DebugFlags {
  grid: boolean;
  gridAlpha: number;
}

export const DEBUG_DEFAULT: DebugFlags = {
  grid: false, // toggle grid visibility
  gridAlpha: 1,
};
