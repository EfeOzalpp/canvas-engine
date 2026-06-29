export type SurfaceDprMode = "cap1" | "device" | "cap2" | "cap3";

export function resolveSurfaceDpr(mode: SurfaceDprMode): number {
  const deviceDpr = Math.max(1, window.devicePixelRatio || 1);
  if (mode === "cap1") return 1;
  if (mode === "cap2") return Math.min(2, deviceDpr);
  if (mode === "cap3") return Math.min(3, deviceDpr);
  return deviceDpr;
}
