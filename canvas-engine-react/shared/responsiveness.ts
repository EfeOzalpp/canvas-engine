// src/canvas-engine/shared/responsiveness.ts

export type DeviceType = "mobile" | "tablet" | "laptop";

function normalizeViewportUnits(value: number) {
  return Math.max(0, Math.floor(value));
}

export function deviceType(w: number): DeviceType {
  const normalizedW = normalizeViewportUnits(w);
  if (normalizedW <= 767) return "mobile";
  if (normalizedW <= 1024) return "tablet";
  return "laptop";
}

export function getViewportSize(): { w: number; h: number } {
  // Avoid crashing in SSR / tests
  if (typeof window === "undefined") return { w: 1024, h: 768 };
  return {
    w: normalizeViewportUnits(window.innerWidth),
    h: normalizeViewportUnits(window.innerHeight),
  };
}
