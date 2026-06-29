export type GPUTextureFormat = string;

export type GPUTextureView = object;
export type GPUSampler = object;

export interface GPUTexture {
  createView: () => GPUTextureView;
  destroy: () => void;
}

export const GPUTextureUsage = {
  TEXTURE_BINDING:   0x04,
  RENDER_ATTACHMENT: 0x10,
} as const;

export interface GPUCanvasContext {
  configure: (configuration: {
    device: GPUDevice;
    format: GPUTextureFormat;
    alphaMode: "premultiplied" | "opaque";
  }) => void;
  getCurrentTexture: () => GPUTexture;
}

// opaque GPU resource handles
export type GPUShaderModule = object;
export type GPURenderPipeline = object;
export type GPUBuffer = object;
export type GPUBindGroup = object;
export type GPUBindGroupLayout = object;
export type GPUPipelineLayout = object;

export interface GPURenderPassEncoder {
  setPipeline: (pipeline: GPURenderPipeline) => void;
  setBindGroup: (index: number, bindGroup: GPUBindGroup, dynamicOffsets?: number[]) => void;
  draw: (vertexCount: number) => void;
  end: () => void;
}

export interface GPUCommandEncoder {
  beginRenderPass: (descriptor: {
    colorAttachments: Array<{
      view: unknown;
      clearValue?: { r: number; g: number; b: number; a: number };
      loadOp: "clear" | "load";
      storeOp: "store" | "discard";
    }>;
  }) => GPURenderPassEncoder;
  finish: () => unknown;
}

export interface GPUQueue {
  submit: (commandBuffers: unknown[]) => void;
  writeBuffer: (
    buffer: GPUBuffer,
    offset: number,
    data: ArrayBuffer,
    dataOffset?: number,
    size?: number,
  ) => void;
}

export interface GPUDevice {
  lost: Promise<GPUDeviceLostInfo>;
  queue: GPUQueue;
  createCommandEncoder: () => GPUCommandEncoder;
  createShaderModule: (descriptor: { code: string }) => GPUShaderModule;
  createBindGroupLayout: (descriptor: {
    entries: Array<{
      binding: number;
      visibility: number;
      buffer?: { type: "uniform" | "storage"; hasDynamicOffset?: boolean };
      sampler?: { type?: string };
      texture?: { sampleType?: string; viewDimension?: string };
    }>;
  }) => GPUBindGroupLayout;
  createPipelineLayout: (descriptor: {
    bindGroupLayouts: GPUBindGroupLayout[];
  }) => GPUPipelineLayout;
  createRenderPipeline: (descriptor: {
    layout: GPUPipelineLayout;
    vertex: { module: GPUShaderModule; entryPoint: string };
    fragment: {
      module: GPUShaderModule;
      entryPoint: string;
      targets: Array<{
        format: GPUTextureFormat;
        blend?: {
          color: { srcFactor: string; dstFactor: string; operation: string };
          alpha: { srcFactor: string; dstFactor: string; operation: string };
        };
      }>;
    };
    primitive: { topology: "triangle-list" | "triangle-strip" | "point-list" };
  }) => GPURenderPipeline;
  createBuffer: (descriptor: { size: number; usage: number }) => GPUBuffer;
  createTexture: (descriptor: {
    size: [number, number] | [number, number, number];
    format: GPUTextureFormat;
    usage: number;
  }) => GPUTexture;
  createSampler: (descriptor?: {
    magFilter?: "nearest" | "linear";
    minFilter?: "nearest" | "linear";
  }) => GPUSampler;
  createBindGroup: (descriptor: {
    layout: GPUBindGroupLayout;
    entries: Array<{ binding: number; resource: { buffer: GPUBuffer } | GPUSampler | GPUTextureView }>;
  }) => GPUBindGroup;
  destroy: () => void;
}

export interface GPUDeviceLostInfo {
  reason?: string;
  message?: string;
}

export interface GPUAdapter {
  requestDevice: () => Promise<GPUDevice>;
}

export interface GPU {
  requestAdapter: (options?: {
    powerPreference?: "low-power" | "high-performance";
  }) => Promise<GPUAdapter | null>;
  getPreferredCanvasFormat: () => GPUTextureFormat;
}

export type NavigatorWithGPU = Navigator & {
  gpu?: GPU;
};

export const GPUBufferUsage = {
  UNIFORM: 0x0040,
  COPY_DST: 0x0008,
} as const;

export const GPUShaderStage = {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
} as const;
