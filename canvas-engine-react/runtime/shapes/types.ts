import type { ShapeDrawOptions } from "../../shapes/types";

// Runtime creates these options for shape draw functions every frame.
// Shape-specific palette overrides stay owned by the shape files, not the runtime bridge.
export type RuntimeShapeOptions = Omit<ShapeDrawOptions, "palette" | "paletteTheme"> & {
  palette?: never;
  paletteTheme?: never;
};
