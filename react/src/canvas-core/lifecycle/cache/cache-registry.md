# Cache Registry

Maps cache strategy name strings to GPU pass cache factories.

Only pass-level GPU caches belong here — strategies referenced in `cache` on `InstancedPassDefinition`.
Math caches (no-pass) are plain data stores; they live in `cache/math/` and are consumed directly,
not through this registry.

## Adding a strategy

1. Create a folder under `cache/pass-instances/<name>/`.
2. Call `registerCacheStrategy("your-name", factory)` there.
3. Import it in `cache/index.ts` for its side effect.
4. Reference `"your-name"` in a pass's `cache` property.
