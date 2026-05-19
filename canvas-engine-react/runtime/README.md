# Runtime

The runtime is the canvas side of the engine. It receives app-level controls, owns the canvas loop, builds grid/render context, then hands items to shape draw functions.

Main flow:

```txt
index.ts
  -> engine/loop.ts
  -> render/*
  -> shapes/registry.ts
  -> src/canvas-engine/shapes/*
```

Type ownership:

```txt
engine/types.ts         public controls and start options
engine/field.ts         item payload contract
engine/state.ts         runtime-owned defaults and mutable state shape
engine/itemLifecycle.ts per-item appear/replay lifecycle state
render/*                render-pass params local to each render helper
```

The important boundary is this: app code talks to `EngineControls`; the loop talks to render helpers; render helpers talk to shapes. Shape-specific drawing options should stay close to shapes unless more than one runtime layer truly needs the same contract.
