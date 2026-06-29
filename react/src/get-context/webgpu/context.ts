import { emitRenderContextDisposed } from "../lifetime-events";
import type { GetRenderContextOptions, RenderContext } from "../types";
import type { DrawLinearGradientOptions, DrawShapeOptions, ParticleInstance, RenderSurface } from "../../render-api";
import { getGPU } from "./capability";
import { watchWebGPUDeviceLost } from "./lifetime";
import { createShapePipeline, type ShapePipeline } from "./shape";
import { createGradientPipeline, type GradientPipeline } from "./gradient";
import { createOffscreenPipeline, type WebGPUFrameState } from "./offscreen";
import type {
  GPU,
  GPUCanvasContext,
  GPUDevice,
  GPUTextureFormat,
} from "./types";
import type { OffscreenApi as RenderOffscreenApi } from "../../render-api";

async function requestWebGPUDevice(gpu: GPU): Promise<GPUDevice> {
  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("WebGPU adapter request failed.");
  return adapter.requestDevice();
}

export async function createWebGPUContext(options: GetRenderContextOptions): Promise<RenderContext> {
  const { canvas } = options;
  const gpu = getGPU();
  if (!gpu) throw new Error("WebGPU is not available in this browser.");
  const activeGpu = gpu;

  const context = canvas.getContext("webgpu") as unknown as GPUCanvasContext | null;
  if (!context) throw new Error("WebGPU canvas context is not available.");
  const activeContext = context;

  const format: GPUTextureFormat = activeGpu.getPreferredCanvasFormat();
  let device: GPUDevice | null = null;
  let shapePipeline: ShapePipeline | null = null;
  let gradientPipeline: GradientPipeline | null = null;
  let offscreenPipeline: RenderOffscreenApi | null = null;
  let status: RenderContext["status"] = "restoring";
  let disposed = false;
  let generation = 0;
  let surface: RenderSurface = {
    cssWidth: canvas.clientWidth || 1,
    cssHeight: canvas.clientHeight || 1,
    pixelWidth: canvas.width || 1,
    pixelHeight: canvas.height || 1,
  };

  const frameState: WebGPUFrameState = {
    encoder: null,
    pass: null,
    swapChainView: null,
  };

  function configure(activeDevice: GPUDevice) {
    activeContext.configure({ device: activeDevice, format, alphaMode: "premultiplied" });
  }

  async function createDevice() {
    const nextDevice = await requestWebGPUDevice(activeGpu);
    device = nextDevice;
    shapePipeline = createShapePipeline(nextDevice, format);
    gradientPipeline = createGradientPipeline(nextDevice, format);
    offscreenPipeline = createOffscreenPipeline(nextDevice, format, frameState);
    generation += 1;
    const deviceGeneration = generation;
    configure(nextDevice);

    watchWebGPUDeviceLost({
      canvas,
      device: nextDevice,
      deviceGeneration,
      renderOptions: options,
      getGeneration: () => generation,
      getDisposed: () => disposed,
      setStatus: (s) => { status = s; },
      restoreDevice: createDevice,
    });
  }

  await createDevice();
  status = "ready";

  return {
    kind: "webgpu",
    get status() { return status; },
    get surface() { return surface; },
    get offscreen() { return offscreenPipeline ?? undefined; },
    canvas,
    resizeAllocation(nextSurface: RenderSurface) {
      canvas.width = Math.max(1, nextSurface.pixelWidth);
      canvas.height = Math.max(1, nextSurface.pixelHeight);
      surface = nextSurface;
      if (status !== "ready" || !device) return;
      configure(device);
    },
    beginFrame() {
      if (status !== "ready" || !device) return;
      shapePipeline?.beginFrame();
      frameState.encoder = device.createCommandEncoder();
    },
    clear(color) {
      if (status !== "ready" || !device || !frameState.encoder) return;
      const view = activeContext.getCurrentTexture().createView();
      frameState.swapChainView = view;
      frameState.pass = frameState.encoder.beginRenderPass({
        colorAttachments: [{
          view,
          clearValue: color,
          loadOp: "clear",
          storeOp: "store",
        }],
      });
    },
    drawShape(opts: DrawShapeOptions) {
      if (!frameState.pass || !shapePipeline) return;
      shapePipeline.drawShape(frameState.pass, surface, opts);
    },
    drawLinearGradient(opts: DrawLinearGradientOptions) {
      if (!frameState.pass || !gradientPipeline) return;
      gradientPipeline.drawLinearGradient(frameState.pass, surface, opts);
    },
    drawParticles(_particles: ParticleInstance[]) {
      // TODO: particle instanced draw
    },
    endFrame() {
      if (!frameState.pass || !frameState.encoder || !device) return;
      frameState.pass.end();
      device.queue.submit([frameState.encoder.finish()]);
      frameState.encoder = null;
      frameState.pass = null;
      frameState.swapChainView = null;
    },
    dispose() {
      disposed = true;
      status = "disposed";
      emitRenderContextDisposed(options, canvas, "webgpu");
      device?.destroy();
      device = null;
      shapePipeline = null;
      gradientPipeline = null;
      offscreenPipeline = null;
    },
  };
}