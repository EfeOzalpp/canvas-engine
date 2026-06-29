import type { DrawShapeOptions } from "../../../render-api";
import type { RenderSurface } from "../../../render-api";
import { SHAPE_SHADER } from "./shaders";
import {
  GPUBufferUsage,
  GPUShaderStage,
  type GPURenderPipeline,
  type GPUDevice,
  type GPURenderPassEncoder,
  type GPUTextureFormat,
  type GPUBuffer,
  type GPUBindGroup,
} from "../types";

const UNIFORM_SIZE = 64;         // 4 × vec4f — actual data size
const SLOT_SIZE = 256;           // minUniformBufferOffsetAlignment (safe default)
const MAX_DRAWS_PER_FRAME = 16_384;

export interface ShapePipeline {
  beginFrame: () => void;
  drawShape: (pass: GPURenderPassEncoder, surface: RenderSurface, opts: DrawShapeOptions) => void;
}

export function createShapePipeline(
  device: GPUDevice,
  format: GPUTextureFormat
): ShapePipeline {
  const shaderModule = device.createShaderModule({ code: SHAPE_SHADER });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: "uniform", hasDynamicOffset: true },
    }],
  });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: { module: shaderModule, entryPoint: "vs_main" },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one",       dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });

  const ringBuffer: GPUBuffer = device.createBuffer({
    size: MAX_DRAWS_PER_FRAME * SLOT_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // One bind group — dynamic offset selects the slot per draw.
  // Bind group size declaration uses UNIFORM_SIZE; the buffer is larger.
  const bindGroup: GPUBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: ringBuffer, size: UNIFORM_SIZE } }],
  });

  let drawIndex = 0;
  let warnedAtDrawLimit = false;

  function beginFrame(): void {
    drawIndex = 0;
    warnedAtDrawLimit = false;
  }

  function drawShape(
    pass: GPURenderPassEncoder,
    surface: RenderSurface,
    opts: DrawShapeOptions
  ): void {
    if (drawIndex >= MAX_DRAWS_PER_FRAME) {
      if (import.meta.env.DEV && !warnedAtDrawLimit) {
        warnedAtDrawLimit = true;
        console.warn(
          `[canvas-engine] WebGPU shape draw limit reached (${MAX_DRAWS_PER_FRAME}). ` +
          "Additional shapes will be skipped this frame. Raise the limit or batch shape draws."
        );
      }
      return;
    }

    const kind = opts.kind === "circle" ? 1 : opts.kind === "ellipse" ? 2 : 0;
    const offset = drawIndex * SLOT_SIZE;

    const data = new Float32Array([
      surface.cssWidth, surface.cssHeight, 0, 0,
      opts.x, opts.y, opts.w, opts.h,
      opts.color.r, opts.color.g, opts.color.b, opts.color.a,
      kind, 0, 0, 0,
    ]);

    device.queue.writeBuffer(ringBuffer, offset, data.buffer, 0, UNIFORM_SIZE);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup, [offset]);
    pass.draw(6);
    drawIndex++;
  }

  return { beginFrame, drawShape };
}
