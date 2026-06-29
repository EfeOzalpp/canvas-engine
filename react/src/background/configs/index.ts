import type { CanvasBackgroundConfig } from "../../canvas-core/render-passes/instanced-passes/registry";
import { resolvePassConfigs } from "../../canvas-core/render-passes/instanced-passes/resolveConfigs";

const modules = import.meta.glob<{ default: CanvasBackgroundConfig }>('./*.ts', { eager: true });
resolvePassConfigs("background", modules);