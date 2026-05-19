# Canvas Modifiers

This folder holds reusable drawing modifiers for the canvas engine.

The shape files should stay responsible for their own art direction. Modifiers provide shared math and rendering helpers so the shapes do not need to re-create the same low-level behavior everywhere.

## Main Groups

`color-modifiers/`

Color conversion, blending, brightness, saturation, fog, gradients, and palette helpers.

`color-modifiers/index.ts` is the public surface for color helpers. `style.ts` composes a higher-level visual style, so it is not the folder index. Small primitives like `RGB`, `Stop`, `clamp01`, `lerp`, and CSS color parsing live in `utils.ts`.

`shape-modifiers/`

Geometry and animation helpers for shape bodies, such as lobes, displacement, lerping, and applying shape modifier configs.

`shape-modifiers/index.ts` is the public surface for shape helpers. `apply.ts` resolves declarative shape modifier configs into a transform envelope, while `types.ts` owns the config contracts. `ranges.ts` handles the common fixed-number-or-range pattern used by shape art direction.

`projection/`

Grid placement to pixel projection. This is where a footprint like `{ r0, c0, w, h }` becomes the `{ x, y, w, h }` rectangle that shapes draw.

The projection helper uses the footprint's bottom row as the sizing row. This keeps tall shapes anchored to the visual row they stand on, even when perspective rows have different widths and heights.

`lighting/`

Scene light sampling and small painting helpers. Runtime creates the light context, shapes sample it for their own rectangles, then shapes decide how much lighting to actually draw.

`particles/`

Generic particle emitters and particle-specific perspective helpers. The emitters step and draw particles, but they consume final options such as `count`, `size`, `speed`, `lifetime`, `rect`, and `color`.

`particles/types.ts` owns the shared emitter contracts and tiny drawing surface. `particles/utils.ts` owns shared math and PRNG helpers. Hashing stays inside each emitter when the seed contract is different.

`particles/perspective/`

Particle perspective scaling helpers. These read runtime row-height data, build depth buckets, and return a normalized `t` value for the placed object's row depth.

Shapes use that `t` to scale particle settings before passing them to the particle systems.

Example flow:

```ts
const rowBucket = particleRowBucket(rect, opts);
const sizeScale = particleBucketRange(rowBucket.t, 0.26, 1.0);

stepAndDrawPuffs(p, {
  size: { min: baseMin * sizeScale, max: baseMax * sizeScale },
});
```

## Shape Size vs Particle Perspective

Shape bodies usually scale through the grid layout:

```ts
const { x, y, w, h } = footprintToPx(rect, opts);
```

Particle behavior needs a separate perspective pass because emitters have their own settings. A bigger rendered shape does not automatically mean its smoke, rain, or snow has the right size, speed, lifetime, or count.

So the split is:

```txt
shape body size:
  grid layout -> projection -> footprintToPx / rowHeightAt / rowWidthAt

particle behavior:
  row heights -> particleRowBucket -> particleBucketRange -> emitter options
```

## Public Boundary

Most consumers should import from `modifiers/index.ts`.

Internal helper files can stay hidden behind the folder-level APIs unless another folder truly needs that lower-level contract.
