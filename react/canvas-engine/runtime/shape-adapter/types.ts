import type { ShapeDrawOptions, ShapeStyleOptions } from "../../shapes/types";

export type RuntimeStyleOptions = Omit<ShapeStyleOptions, "palette"> & {
  palette?: never;
  gradientRGBOverrideActive?: boolean;
};

export type RuntimeShapeOptions = Omit<ShapeDrawOptions, "style"> & {
  paletteTheme?: never;
  style?: RuntimeStyleOptions;
};
