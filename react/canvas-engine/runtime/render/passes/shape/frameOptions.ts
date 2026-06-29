import type { SceneLightContext } from "../../../../modifiers";
import type { ParticleStore } from "../../../../modifiers/particles";
import type { RGB } from "../../../../shared/math";
import type { GridMetrics } from "../../../geometry/gridCache";
import type { RuntimeShapeOptions } from "../../../shape-adapter/types";
import type { EngineFieldItem } from "../../../engine/field";
import type { EngineShapeLightSource, EngineStyle } from "../../../engine/state";

interface RuntimeShapeLightFallback {
  x: number;
  y: number;
  paletteClosenessK?: number;
}

type RuntimeShapeLightItem = EngineFieldItem | RuntimeShapeLightFallback | null;

function findVisibleLightItem(items: EngineFieldItem[]): EngineFieldItem | null {
  for (const item of items) {
    if (item.shape === "sun") return item;
  }
  return null;
}

export function resolveShapeLightItem(args: {
  items: EngineFieldItem[];
  source: EngineShapeLightSource | null;
  width: number;
  height: number;
}): RuntimeShapeLightItem {
  const visibleLightItem = findVisibleLightItem(args.items);
  if (visibleLightItem) return visibleLightItem;

  const { source } = args;
  if (!source) return null;

  const lightItem: RuntimeShapeLightFallback = {
    x: args.width * source.xK,
    y: args.height * source.yK,
  };

  if (typeof source.paletteClosenessK === "number") {
    lightItem.paletteClosenessK = source.paletteClosenessK;
  }

  return lightItem;
}

export function createRuntimeShapeBaseOptions(args: {
  grid: {
    cell: number;
    cellW: number;
    cellH: number;
    metrics: GridMetrics;
  };
  style: EngineStyle;
  liveAvg: number;
  gradientRGB: RGB | null;
  sceneLight: SceneLightContext | null;
  timeMs: number;
  dtSec: number;
  particleStore: ParticleStore;
}): RuntimeShapeOptions {
  const { grid, style } = args;

  return {
    projection: {
      cell: grid.cell,
      cellW: grid.cellW,
      cellH: grid.cellH,
      ...grid.metrics,
    },
    style: {
      gradientRGB: args.gradientRGB,
      gradientRGBOverrideActive: style.gradientRGBOverride != null,
      blend: style.blend,
      liveAvg: args.liveAvg,
      alpha: 235,
      exposure: style.exposure,
      contrast: style.contrast,
      darkMode: style.darkMode,
      lightCtx: args.sceneLight,
    },
    lifecycle: {
      timeMs: args.timeMs,
      dtSec: args.dtSec,
    },
    particles: {
      particleStore: args.particleStore,
    },
  };
}
