import type { CanvasConfig } from "./registry";
import { setCanvasConfig } from "./registry";

// Extracts canvas id from a glob path like './a.ts' → 'a'.
function idFromPath(path: string): string {
  return path.slice(2, -3);
}

// Each pass calls this from its own configs/index.ts with its own glob result.
// The pass key (e.g. "background") scopes the config into the right CanvasConfig field.
export function resolvePassConfigs<K extends keyof CanvasConfig>(
  passKey: K,
  modules: Record<string, { default: CanvasConfig[K] }>,
): void {
  for (const [path, mod] of Object.entries(modules)) {
    if (!mod.default) continue;
    const id = idFromPath(path);
    setCanvasConfig(id, { [passKey]: mod.default } as Partial<CanvasConfig>);
  }
}