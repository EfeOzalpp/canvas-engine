# Signal Registry

Maps typed invalidation signal names to subscription factories that drive pass-level cache correctness.

Only pass invalidation signals belong here: signals referenced in `invalidatedBy` on
`InstancedPassDefinition`. Signals that wire to non-pass lifecycle concerns, such as
GPU lifetime or surface meta behavior, are registered where they live.

## Adding a signal

1. Add the name to `InvalidationSignalName` in `signal-registry.ts`.
2. Call `registerSignal("your-name", factory)` in the stable-signal module that defines it.
3. Document the name in `render-passes/invalidation.md`.
4. Reference `"your-name"` in a pass's `invalidatedBy`.
