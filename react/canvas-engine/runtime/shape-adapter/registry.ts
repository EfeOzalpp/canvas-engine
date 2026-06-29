// src/canvas-engine/runtime/shape-adapter/registry.ts

import type { PLike } from "../p/makeP";
import type { EngineFieldItem } from "../engine/field";
import type { RuntimeShapeOptions } from "./types";
import type { ShapeRenderPass } from "../../modifiers/index";
import { deviceType } from "../../shared/responsiveness";

import {
  SHAPE_RENDER_PASSES,
  drawClouds,
  drawSnow,
  drawHouse,
  drawPower,
  drawSun,
  drawVilla,
  drawCarFactory,
  drawCar,
  drawSea,
  drawBus,
  drawTrees,
} from "../../shapes/index";

export interface DrawFn {
  (p: PLike, it: EngineFieldItem, rEff: number, opts: RuntimeShapeOptions): void;
  supportedRenderPasses?: ReadonlySet<ShapeRenderPass>;
}

function withCatalogPasses(shape: string, draw: DrawFn): DrawFn {
  const passes = SHAPE_RENDER_PASSES[shape] ?? [];
  draw.supportedRenderPasses = new Set(["color", ...passes]);
  return draw;
}

export function supportsShapeRenderPass(draw: DrawFn, pass: ShapeRenderPass): boolean {
  return pass === "color" || draw.supportedRenderPasses?.has(pass) === true;
}

export function shapeRegistrySupportsRenderPass(
  registry: ShapeRegistry,
  shape: string,
  pass: ShapeRenderPass
): boolean {
  const draw = registry.get(shape);
  return draw ? supportsShapeRenderPass(draw, pass) : false;
}

export function createRegistry(entries: Record<string, DrawFn>) {
  return new Map<string, DrawFn>(Object.entries(entries));
}

export type ShapeRegistry = ReturnType<typeof createRegistry>;

export interface RuntimeShapeServices {
  registry: ShapeRegistry;
}

export function createDefaultShapeRegistry(): ShapeRegistry {
  return createRegistry({
    snow: withCatalogPasses("snow", (p2, it, rEff, opts) => {
      const vw = p2.width;
      const dt = deviceType(vw);
      const hideFrac = dt === "mobile" ? 0.56 : dt === "tablet" ? 0.52 : 0.5;
      const hideBucketT = dt === "mobile" ? 0.72 : dt === "tablet" ? 0.66 : 0.60;

      drawSnow(p2, it.x, it.y, rEff, {
        ...opts,
        projection: { ...opts.projection, footprint: it.footprint },
        hideGroundAboveFrac: hideFrac,
        hideGroundBelowBucketT: hideBucketT,
        showGround: true,
      });
    }),

    house: withCatalogPasses("house",
      (p2, it, rEff, opts) => { drawHouse(p2, it.x, it.y, rEff, opts); },
    ),
    power: withCatalogPasses("power",
      (p2, it, rEff, opts) => { drawPower(p2, it.x, it.y, rEff, opts); },
    ),
    villa: withCatalogPasses("villa",
      (p2, it, rEff, opts) => { drawVilla(p2, it.x, it.y, rEff, opts); },
    ),
    carFactory: withCatalogPasses("carFactory",
      (p2, it, rEff, opts) => { drawCarFactory(p2, it.x, it.y, rEff, opts); },
    ),
    bus: withCatalogPasses("bus", (p2, it, rEff, opts) => { drawBus(p2, it.x, it.y, rEff, opts); }),
    trees: withCatalogPasses("trees",
      (p2, it, rEff, opts) => { drawTrees(p2, it.x, it.y, rEff, opts); },
    ),
    car: withCatalogPasses("car", (p2, it, rEff, opts) => { drawCar(p2, it.x, it.y, rEff, opts); }),
    sea: withCatalogPasses("sea", (p2, it, rEff, opts) => { drawSea(p2, it.x, it.y, rEff, opts); }),
    sun: withCatalogPasses("sun", (p2, it, rEff, opts) => { drawSun(p2, it.x, it.y, rEff, opts); }),
    clouds: withCatalogPasses("clouds", (p2, it, rEff, opts) => { drawClouds(p2, it.x, it.y, rEff, opts); }),
  });
}
