// src/canvas-engine/shared/responsiveness.ts

export type DeviceType = "mobile" | "tablet" | "laptop";
export type DeviceCountScale = Partial<Record<DeviceType, number>>;

const MOBILE_LANDSCAPE_SHORT_SIDE_MAX = 600;

function normalizeViewportUnits(value: number) {
  return Math.max(0, Math.floor(value));
}

function supportsTouch(): boolean {
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
}

function hasCoarsePointer(): boolean {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
}

function userAgent() {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

export function deviceType(w: number): DeviceType {
  const normalizedW = normalizeViewportUnits(w);
  if (normalizedW <= 767) return "mobile";
  if (normalizedW <= 1024) return "tablet";
  return "laptop";
}

export function viewportDeviceType(width: number, height: number): DeviceType {
  const w = normalizeViewportUnits(width);
  const h = normalizeViewportUnits(height);
  const shortSide = Math.min(w, h);
  const touch = supportsTouch();
  const coarse = hasCoarsePointer();
  const ua = userAgent();
  const isiPhone = /\biPhone\b|\biPod\b/.test(ua);
  const isAndroidPhone = /\bAndroid\b/i.test(ua) && /\bMobile\b/i.test(ua);
  const isIPad = /\biPad\b/.test(ua) || (/\bMacintosh\b/.test(ua) && touch);
  const isAndroidTablet = /\bAndroid\b/i.test(ua) && !/\bMobile\b/i.test(ua);

  if (isiPhone || isAndroidPhone) return "mobile";
  if (isIPad || isAndroidTablet) return "tablet";

  if ((touch || coarse) && shortSide <= MOBILE_LANDSCAPE_SHORT_SIDE_MAX) {
    return "mobile";
  }

  if ((touch || coarse) && w <= 1366) {
    return "tablet";
  }

  return deviceType(w);
}

export function currentViewportDeviceType(fallbackWidth: number): DeviceType {
  if (typeof window === "undefined") return deviceType(fallbackWidth);
  return viewportDeviceType(window.innerWidth, window.innerHeight);
}

// Adjusts scene density for touch landscape viewports. The scale values belong
// to the scene profile because each canvas has different authored density.
// Returns 1 on non-touch devices or portrait orientation.
export function getLandscapeCountScale(
  device: DeviceType,
  scaleByDevice: DeviceCountScale | undefined
): number {
  if (typeof window === "undefined") return 1;
  const isTouch = supportsTouch() || hasCoarsePointer();
  if (!isTouch) return 1;
  const isLandscape = window.innerWidth > window.innerHeight;
  if (!isLandscape) return 1;

  return scaleByDevice?.[device] ?? 1;
}

export function getViewportSize(): { w: number; h: number } {
  // Avoid crashing in SSR / tests
  if (typeof window === "undefined") return { w: 1024, h: 768 };
  return {
    w: normalizeViewportUnits(window.innerWidth),
    h: normalizeViewportUnits(window.innerHeight),
  };
}
