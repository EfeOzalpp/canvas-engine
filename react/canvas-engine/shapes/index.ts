// src/canvas-engine/shapes/index.ts

import { drawClouds } from './clouds';
import { drawSnow } from './snow';
import { drawHouse } from './house';
import { drawPower } from './power';
import { drawVilla } from './villa';
import { drawCar } from './car';
import { drawSea } from './sea';
import { drawSun } from './sun';
import { drawCarFactory } from './carFactory';
import { drawBus } from './bus';
import { drawTrees } from './trees';
import type { ShapeRenderPass } from "../modifiers/index";

export { drawClouds };
export { drawSnow };
export { drawHouse };
export { drawPower };
export { drawVilla };
export { drawCar };
export { drawSea };
export { drawSun };
export { drawCarFactory };
export { drawBus };
export { drawTrees };

// Shape-level render metadata stays with the public shape surface.
// Runtime reads this to know which optional passes each shape implements.
export const SHAPE_RENDER_PASSES: Record<string, readonly ShapeRenderPass[]> = {
  house: ["depthMask"],
  power: ["depthMask"],
  villa: ["depthMask"],
  carFactory: ["depthMask"],
  bus: ["depthMask"],
  car: ["depthMask"],
  trees: ["depthMask"],
  sea: ["depthMask"],
};

type EnvironmentLightShape = readonly ["lightShape", `#${string}`, `#${string}`?];

// Environment light metadata lets runtime-level effects, such as fog gradients,
// follow the authored light object without shape-specific branches. Use a
// highlight-oriented color here; the fog pass applies its own low opacity.
export const ENVIRONMENT_LIGHT_SHAPE: Partial<Record<string, EnvironmentLightShape>> = {
  sun: ["lightShape", "#ffffff", "#3f5676"],
} as const;
