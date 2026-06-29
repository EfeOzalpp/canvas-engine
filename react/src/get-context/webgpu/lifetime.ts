import {
  emitRenderContextLost,
  emitRenderContextRestored,
  emitRenderContextRestoreFailed,
} from "../lifetime-events";
import type { GetRenderContextOptions, RenderContext } from "../types";
import type { GPUDevice } from "./types";

export interface WatchWebGPUDeviceLostOptions {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  deviceGeneration: number;
  renderOptions: GetRenderContextOptions;
  getGeneration: () => number;
  getDisposed: () => boolean;
  setStatus: (status: RenderContext["status"]) => void;
  restoreDevice: () => Promise<void>;
}

export function watchWebGPUDeviceLost(options: WatchWebGPUDeviceLostOptions) {
  void options.device.lost.then((info) => {
    void handleDeviceLost(options, info);
  });
}

async function handleDeviceLost(
  options: WatchWebGPUDeviceLostOptions,
  info: { reason?: string; message?: string }
) {
  if (
    options.getDisposed() ||
    options.deviceGeneration !== options.getGeneration() ||
    info.reason === "destroyed"
  ) {
    return;
  }

  options.setStatus("lost");
  emitRenderContextLost(options.renderOptions, {
    type: "gpu-lost",
    canvas: options.canvas,
    contextKind: "webgpu",
    reason: info.reason,
    message: info.message,
  });

  options.setStatus("restoring");
  try {
    await options.restoreDevice();
    options.setStatus("ready");
    await emitRenderContextRestored(options.renderOptions, {
      type: "gpu-restored",
      canvas: options.canvas,
      contextKind: "webgpu",
    });
  } catch (error: unknown) {
    options.setStatus("restore-failed");
    emitRenderContextRestoreFailed(options.renderOptions, {
      type: "gpu-restore-failed",
      canvas: options.canvas,
      contextKind: "webgpu",
      error,
    });
  }
}
