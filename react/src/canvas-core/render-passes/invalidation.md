# Invalidation Signal Reference

Signal names for use in `InstancedPassDefinition.invalidatedBy`.
Each signal is registered in its stable-signal module under `lifecycle/stable-signals/`.

## Instanced

These fire only for the affected canvas.

| Name | Source | When |
|---|---|---|
| `"surface-layout-change"` | `lifecycle/stable-signals/instanced/surface.ts` | Canvas CSS width or height changed |
| `"surface-allocation-change"` | `lifecycle/stable-signals/instanced/surface.ts` | Canvas pixel dimensions or DPR changed |
| `"surface-projection-change"` | `lifecycle/stable-signals/instanced/surface.ts` | Canvas aspect ratio changed |

## Global

_(none yet)_

## Adding a new signal

1. Add the name to `InvalidationSignalName` in `lifecycle/stable-signals/signal-registry.ts`.
2. Call `registerSignal("your-name", factory)` in the relevant `lifecycle/stable-signals/` file.
3. Add a row to the table above.
4. Reference `"your-name"` in any pass's `invalidatedBy`.
