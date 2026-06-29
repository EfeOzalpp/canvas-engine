import type { DrawLinearGradientOptions } from "../../../render-api";
import type { RenderSurface } from "../../../render-api";
import { GRADIENT_SHADER } from "./shaders";
import {
  GPUBufferUsage,
  GPUShaderStage,
  type GPUDevice,
  type GPURenderPassEncoder,
  type GPUTextureFormat,
  type GPUBuffer,
  type GPUBindGroup,
} from "../types";

// Buffer layout (400 bytes, 16-byte aligned throughout):
//   offset   0: resolution  vec2<f32>          (8  bytes)
//   offset   8: stopCount   u32                (4  bytes)
//   offset  12: _pad        u32                (4  bytes)
//   offset  16: positions   array<vec4<f32>,4>  (64 bytes)  — 16 stop positions packed 4-per-vec4
//   offset  80: colors      array<vec4<f32>,16> (256 bytes) — 16 rgba stops
//   offset 336: hold        array<vec4<f32>,4>  (64 bytes)  — 16 hold flags packed 4-per-vec4
const UNIFORM_SIZE = 400;
const MAX_STOPS = 16;

export interface GradientPipeline {
  drawLinearGradient: (
    pass: GPURenderPassEncoder,
    surface: RenderSurface,
    opts: DrawLinearGradientOptions,
  ) => void;
}

export function createGradientPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
): GradientPipeline {
  const shaderModule = device.createShaderModule({ code: GRADIENT_SHADER });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: "uniform" },
    }],
  });

  const pipeline = device.createRenderPipeline({
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

  const uniformBuffer: GPUBuffer = device.createBuffer({
    size: UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindGroup: GPUBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  // Pre-allocated; written fresh each draw to avoid GC pressure.
  const data = new ArrayBuffer(UNIFORM_SIZE);
  const f32 = new Float32Array(data);
  const u32 = new Uint32Array(data);

  function drawLinearGradient(
    pass: GPURenderPassEncoder,
    surface: RenderSurface,
    opts: DrawLinearGradientOptions,
  ): void {
    const count = Math.min(opts.stops.length, MAX_STOPS);

    // Resolution + stopCount
    f32[0] = surface.pixelWidth;
    f32[1] = surface.pixelHeight;
    u32[2] = count;
    // f32[3] = pad (already 0)

    for (let k = 0; k < count; k++) {
      const stop = opts.stops[k];
      // Positions: float index 4+k   (vec4 packing: positions[k/4][k%4])
      f32[4 + k] = stop.position;
      // Colors: float index 20 + k*4 (colors[k].xyzw)
      const ci = 20 + k * 4;
      f32[ci]     = stop.rgba[0];
      f32[ci + 1] = stop.rgba[1];
      f32[ci + 2] = stop.rgba[2];
      f32[ci + 3] = stop.rgba[3];
      // Hold flags: float index 84+k  (vec4 packing: hold[k/4][k%4])
      f32[84 + k] = stop.holdToNext ? 1.0 : 0.0;
    }

    device.queue.writeBuffer(uniformBuffer, 0, data);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
  }

  return { drawLinearGradient };
}