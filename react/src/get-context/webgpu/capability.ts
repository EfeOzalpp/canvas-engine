import type { GPU, NavigatorWithGPU } from "./types";

export function getGPU(): GPU | null {
  return typeof navigator !== "undefined"
    ? (navigator as NavigatorWithGPU).gpu ?? null
    : null;
}

export function canUseWebGPU(): boolean {
  return getGPU() != null;
}

export async function canCreateWebGPUDevice(): Promise<boolean> {
  const gpu = getGPU();
  if (!gpu) return false;

  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) return false;

  const device = await adapter.requestDevice();
  device.destroy();
  return true;
}
