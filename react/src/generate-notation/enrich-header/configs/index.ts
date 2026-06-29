import type { PlacementConfig } from "../types";

const configs = new Map<string, PlacementConfig>();

function idFromPath(path: string): string {
  return path.slice(2, -3);
}

const modules = import.meta.glob<{ default: PlacementConfig }>("./*.ts", { eager: true });
for (const [path, mod] of Object.entries(modules)) {
  if (!mod.default) continue;
  configs.set(idFromPath(path), mod.default);
}

export function getPlacementConfig(canvasId: string): PlacementConfig | undefined {
  return configs.get(canvasId);
}

export function getPlacementCanvasIds(): string[] {
  return Array.from(configs.keys());
}
