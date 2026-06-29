import type { SurfaceState } from "./surface-state";

const ASPECT_EPSILON = 0.0001;

export interface SurfaceLifecycleSignalBase {
  previous: SurfaceState | null;
  next: SurfaceState;
}

export interface SurfaceLayoutChange extends SurfaceLifecycleSignalBase {
  type: "layout-change";
  cssWidth: number;
  cssHeight: number;
}

export interface SurfaceAllocationChange extends SurfaceLifecycleSignalBase {
  type: "allocation-change";
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
}

export interface SurfaceProjectionChange extends SurfaceLifecycleSignalBase {
  type: "projection-change";
  aspect: number;
}

export type SurfaceLifecycleSignal =
  | SurfaceLayoutChange
  | SurfaceAllocationChange
  | SurfaceProjectionChange;

export function deriveSurfaceLifecycleSignals(
  previous: SurfaceState | null,
  next: SurfaceState
): SurfaceLifecycleSignal[] {
  const signals: SurfaceLifecycleSignal[] = [];
  const layoutChanged =
    previous == null ||
    previous.cssWidth !== next.cssWidth ||
    previous.cssHeight !== next.cssHeight;
  const allocationChanged =
    previous == null ||
    previous.pixelWidth !== next.pixelWidth ||
    previous.pixelHeight !== next.pixelHeight;
  const projectionChanged =
    previous == null || Math.abs(previous.aspect - next.aspect) > ASPECT_EPSILON;

  if (layoutChanged) {
    signals.push({
      type: "layout-change",
      cssWidth: next.cssWidth,
      cssHeight: next.cssHeight,
      previous,
      next,
    });
  }

  if (allocationChanged) {
    signals.push({
      type: "allocation-change",
      pixelWidth: next.pixelWidth,
      pixelHeight: next.pixelHeight,
      dpr: next.dpr,
      previous,
      next,
    });
  }

  if (projectionChanged) {
    signals.push({
      type: "projection-change",
      aspect: next.aspect,
      previous,
      next,
    });
  }

  return signals;
}

export function isSurfaceLayoutChange(
  signal: SurfaceLifecycleSignal
): signal is SurfaceLayoutChange {
  return signal.type === "layout-change";
}

export function isSurfaceAllocationChange(
  signal: SurfaceLifecycleSignal
): signal is SurfaceAllocationChange {
  return signal.type === "allocation-change";
}

export function isSurfaceProjectionChange(
  signal: SurfaceLifecycleSignal
): signal is SurfaceProjectionChange {
  return signal.type === "projection-change";
}
