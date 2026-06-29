import { canCreateWebGPUDevice, canUseWebGPU, createWebGPUContext } from "./webgpu";
import { createWebGL2Context } from "./webgl2";
import type { GetRenderContextOptions, RenderContext, RenderContextKind } from "./types";

let rendererOverride: RenderContextKind | null = null;

export function setRendererOverride(kind: RenderContextKind | null): void {
  if (!import.meta.env.DEV) return;
  rendererOverride = kind;
}

// setRendererOverride("webgl2");

let autoRenderContextKindPromise: Promise<RenderContextKind> | null = null;

async function resolveAutoRenderContextKind(): Promise<RenderContextKind> {
  autoRenderContextKindPromise ??= (async () => {
    if (!canUseWebGPU()) return "webgl2";

    try {
      return await canCreateWebGPUDevice() ? "webgpu" : "webgl2";
    } catch {
      return "webgl2";
    }
  })();

  return autoRenderContextKindPromise;
}

export async function getRenderContext(
  options: GetRenderContextOptions
): Promise<RenderContext> {
  const preference = rendererOverride ?? options.preference ?? "auto";

  if (preference === "webgl2") {
    return createWebGL2Context(options);
  }

  if (preference === "webgpu") {
    return createWebGPUContext(options);
  }

  const autoKind = await resolveAutoRenderContextKind();

  if (autoKind === "webgpu") {
    try {
      return await createWebGPUContext(options);
    } catch {
      return createWebGL2Context(options);
    }
  }

  return createWebGL2Context(options);
}

export type {
  GetRenderContextOptions,
  RenderContext,
  RenderContextKind,
  RenderContextPreference,
} from "./types";
