// src/canvas-engine/shapes/options.ts

import type {
  ShapeIdentityOptions,
  ShapeLifecycleOptions,
  ShapeOptionGroups,
  ShapePalette,
  ShapeParticleOptions,
  ShapeProjectionOptions,
  ShapeSpriteOptions,
  ShapeStyleOptions,
} from "./types";
import type { ShapeRenderPassOptions } from "../modifiers/index";

// Shared empty groups let shape code read optional groups without allocating a
// fallback object on every draw call. Treat them as read-only.
const EMPTY_PROJECTION: ShapeProjectionOptions = {};
const EMPTY_STYLE: ShapeStyleOptions = {};
const EMPTY_LIFECYCLE: ShapeLifecycleOptions = {};
const EMPTY_IDENTITY: ShapeIdentityOptions = {};
const EMPTY_SPRITE: ShapeSpriteOptions = {};
const EMPTY_PARTICLES: ShapeParticleOptions = {};
const EMPTY_PASS: ShapeRenderPassOptions = {};

// Accessors keep the draw files tied to the grouped option contract instead of
// scattering `opts.foo?.bar` checks through each shape.
export function shapeProjection(opts: ShapeOptionGroups): ShapeProjectionOptions {
  return opts.projection ?? EMPTY_PROJECTION;
}

export function shapeStyle<Palette extends ShapePalette>(
  opts: ShapeOptionGroups<Palette>
): ShapeStyleOptions<Palette> {
  return (opts.style ?? EMPTY_STYLE) as ShapeStyleOptions<Palette>;
}

export function shapeLifecycle(opts: ShapeOptionGroups): ShapeLifecycleOptions {
  return opts.lifecycle ?? EMPTY_LIFECYCLE;
}

export function shapeIdentity(opts: ShapeOptionGroups): ShapeIdentityOptions {
  return opts.identity ?? EMPTY_IDENTITY;
}

export function shapeSprite(opts: ShapeOptionGroups): ShapeSpriteOptions {
  return opts.sprite ?? EMPTY_SPRITE;
}

export function shapeParticles(opts: ShapeOptionGroups): ShapeParticleOptions {
  return opts.particles ?? EMPTY_PARTICLES;
}

export function shapePass(opts: ShapeOptionGroups): ShapeRenderPassOptions {
  return opts.pass ?? EMPTY_PASS;
}
