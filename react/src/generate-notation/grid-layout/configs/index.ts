import type { CanvasGridConfig } from "../../../canvas-core/render-passes/instanced-passes/registry";
import { resolvePassConfigs } from "../../../canvas-core/render-passes/instanced-passes/resolveConfigs";

const modules = import.meta.glob<{ default: CanvasGridConfig }>('./*.ts', { eager: true });
resolvePassConfigs("grid", modules);