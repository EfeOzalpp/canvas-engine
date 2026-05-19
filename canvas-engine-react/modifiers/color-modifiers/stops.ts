// Shared color stops for the main vivid score gradient.

import type { Stop } from "./utils";

export type { Stop } from "./utils";

// Main score gradient. Shapes decide how strongly to blend toward this color.
export const VIVID_COLOR_STOPS: Stop[] = [
  { stop: 0.00, color: { r: 210, g:   10, b:  25 } },
  { stop: 0.20, color: { r: 225, g:  60, b:   30 } },
  { stop: 0.46, color: { r: 255, g: 210, b:  40 } },
  { stop: 0.52, color: { r: 255, g: 245, b: 120 } },
  { stop: 0.58, color: { r: 150, g: 235, b: 120 } },
  { stop: 0.78, color: { r:   75, g: 175, b:  70 } },
  { stop: 1.00, color: { r:   25, g: 120, b:  40 } },
];
