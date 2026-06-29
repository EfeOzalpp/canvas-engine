# Canvas Engine

Canvas engine owns the app-facing canvas host layer, authored scene contracts, runtime renderer, shapes, and shared drawing helpers.

## Important Files

- `EngineHost.tsx` - React host boundary. It selects a host definition, starts/stops runtime, pushes live inputs, and installs dev placement tools. Upstream: app canvas entries; downstream: `hooks`, `runtime`, and `multi-canvas-setup`.
- `scene-state.ts` - global scene lookup-key contract used by scene-rule tables, host definitions, and runtime profiles.
- `multi-canvas-setup/` - host definitions: mount id, scene id, bounds, FPS/DPR policy, and cross-canvas stop behavior.
- `hooks/` - React-to-runtime bridge: starts the engine, resolves scene fields, and pushes field/style/input updates.
- `scene-rules/` - authored lookup tables that resolve a scene profile.
- `runtime/` - mounted canvas engine, frame loop, render passes, caches, and shape dispatch.
- `shapes/` - authored shape draw functions and shape metadata.
- `modifiers/` - reusable drawing/math helpers used by shapes and render passes.

## Call Tree

```txt
app canvas entry
  -> EngineHost(id, liveAvg, spotlight, ...)
     -> HOST_DEFS[id]
     -> useCanvasEngine(...)
        -> runtime/startCanvasEngine(...)
     -> useSceneField(...)
        -> scene-rules resolve authored profile
        -> scene-logic compose EngineFieldItem[]
        -> EngineControls.setSceneProfile / setFieldItems / setInputs
     -> runtime frame loop
```

Scene key path:

```txt
scene-state.ts SceneLookupKey
  -> scene-rules lookup tables
  -> multi-canvas host definitions
  -> EngineSceneProfile.lookupKey
  -> runtime render decisions
```

## Contracts

External host API:

```ts
EngineHost({
  id,
  open?,
  visible?,
  liveAvg?,
  reservedFootprints?,
  spotlight?,
  fog?,
  shapeLightSource?
})
```

Scene state API:

```ts
SCENE_LOOKUP_KEYS = ["start", "questionnaire", "city", "spotlight"]

SceneState {
  lookupKey: SceneLookupKey
}
```

Rule: root-level files are cross-cutting canvas-engine contracts. Folder-level files should own one subsystem; root files should exist only when multiple subsystems need the same public boundary.
