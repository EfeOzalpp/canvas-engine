# Engine

This folder owns the runtime engine core. It is not the art layer. It should mostly coordinate state, scheduling, lifecycle, and the frame loop.

Files:

```txt
types.ts            public engine controls and start options
field.ts            shape item payload consumed by the renderer
state.ts            engine-owned default state factories
loop.ts             per-frame orchestration
scheduler.ts        shared frame scheduling
instanceRegistry.ts active engine instance tracking
itemLifecycle.ts    appear/replay lifecycle for field items
```

Rule of thumb:

Public caller-facing contracts live in `types.ts`.
The item payload lives in `field.ts`.
Mutable runtime defaults live in `state.ts`.
Frame-only dependency shapes can stay local to `loop.ts`.

If a type is only needed by one helper, keep it in that helper. Move it here only when it becomes part of the engine contract.
