import type { OffscreenApi, OffscreenHandle } from "../../../render-api";
import {
  GPUShaderStage,
  GPUTextureUsage,
  type GPUDevice,
  type GPURenderPassEncoder,
  type GPUTextureFormat,
  type GPUTexture,
  type GPUTextureView,
  type GPUSampler,
  type GPUBindGroup,
  type GPURenderPipeline,
} from "../types";

const BLIT_SHADER = /* wgsl */`
@group(0) @binding(0) var u_sampler: sampler;
@group(0) @binding(1) var u_texture: texture_2d<f32>;

struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VertexOut {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0),
  );
  let p = pos[vid];
  var out: VertexOut;
  out.position = vec4<f32>(p, 0.0, 1.0);
  out.uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  return textureSample(u_texture, u_sampler, in.uv);
}
`;

interface OffscreenTarget {
  texture: GPUTexture;
  view: GPUTextureView;
  bindGroup: GPUBindGroup;
}

function asHandle(t: OffscreenTarget): OffscreenHandle {
  return t as unknown as OffscreenHandle;
}

function fromHandle(h: OffscreenHandle): OffscreenTarget {
  return h as unknown as OffscreenTarget;
}

export interface WebGPUFrameState {
  encoder: import("../types").GPUCommandEncoder | null;
  pass: GPURenderPassEncoder | null;
  swapChainView: GPUTextureView | null;
}

export function createOffscreenPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  frameState: WebGPUFrameState,
): OffscreenApi {
  const shaderModule = device.createShaderModule({ code: BLIT_SHADER });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
    ],
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
          color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });

  const sampler: GPUSampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  return {
    create(pixelWidth, pixelHeight) {
      const texture = device.createTexture({
        size: [Math.max(1, pixelWidth), Math.max(1, pixelHeight)],
        format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });

      const view = texture.createView();

      const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: view },
        ],
      });

      return asHandle({ texture, view, bindGroup });
    },

    bind(handle) {
      const { view } = fromHandle(handle);
      const { encoder, pass } = frameState;
      if (!encoder) return;

      pass?.end();

      frameState.pass = encoder.beginRenderPass({
        colorAttachments: [{
          view,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });
    },

    unbind() {
      const { encoder, pass, swapChainView } = frameState;
      if (!encoder || !swapChainView) return;

      pass?.end();

      frameState.pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: swapChainView,
          loadOp: "load",
          storeOp: "store",
        }],
      });
    },

    blit(handle) {
      const { bindGroup } = fromHandle(handle);
      const { pass } = frameState;
      if (!pass) return;

      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
    },

    destroy(handle) {
      const { texture } = fromHandle(handle);
      texture.destroy();
    },
  };
}