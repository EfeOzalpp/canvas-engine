import type { GridFootprint } from "../../modifiers/index";

// Payload item consumed by the runtime renderer.
// Keep this stable: it is part of the engine API.
export interface EngineFieldItem {
  id: string;
  x: number;
  y: number;
  shape: string;
  footprint?: GridFootprint;
}
