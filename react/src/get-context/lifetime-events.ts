import {
  emitGpuLifetimeSignal,
  type GpuContextKind,
  type GpuContextLostSignal,
  type GpuContextRestoreFailedSignal,
  type GpuContextRestoredSignal,
} from "../canvas-core/lifecycle/stable-signals";
import type { GetRenderContextOptions } from "./types";

export function emitRenderContextLost(
  options: GetRenderContextOptions,
  signal: GpuContextLostSignal
) {
  emitGpuLifetimeSignal(options.gpuLifetimeReactions, signal);
  options.resourceLifecycle?.discard(signal);
}

export async function emitRenderContextRestored(
  options: GetRenderContextOptions,
  signal: GpuContextRestoredSignal
) {
  await options.resourceLifecycle?.rehydrate(signal);
  emitGpuLifetimeSignal(options.gpuLifetimeReactions, signal);
}

export function emitRenderContextRestoreFailed(
  options: GetRenderContextOptions,
  signal: GpuContextRestoreFailedSignal
) {
  emitGpuLifetimeSignal(options.gpuLifetimeReactions, signal);
}

export function emitRenderContextDisposed(
  options: GetRenderContextOptions,
  canvas: HTMLCanvasElement,
  contextKind: GpuContextKind
) {
  emitGpuLifetimeSignal(options.gpuLifetimeReactions, {
    type: "gpu-disposed",
    canvas,
    contextKind,
  });
}
