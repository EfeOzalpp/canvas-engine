import {
  applyCanvasCssSize,
  applyCanvasVisibility,
  applyZIndex,
  markCanvasClosed,
  markCanvasOpen,
  resolveCanvasSize,
} from "./instance-meta";
import {
  installGlobalSurfaceSignal,
  installInstancedSurfaceSignal,
  isSurfaceLayoutChange,
  type InstalledSurfaceSignal,
  type SurfaceReaction,
} from "../lifecycle/stable-signals";
import type {
  AppliedCanvasMeta,
  CanvasInstanceDefinition,
  CanvasInstanceMeta,
  CanvasMetaBehaviorPayload,
  CanvasMetaBehaviorOptions,
} from "./payload.types";

function normalizeFpsCap(fpsCap: number | undefined): number | undefined {
  if (typeof fpsCap !== "number" || !Number.isFinite(fpsCap) || fpsCap <= 0) {
    return undefined;
  }

  return fpsCap;
}

function createCanvasMeta(definition: CanvasInstanceDefinition): CanvasInstanceMeta {
  const { id, fpsCap, zIndex = 0, ...config } = definition;
  return { id, ...config, fpsCap: normalizeFpsCap(fpsCap), zIndex };
}

function applyBaseCanvasStyle(canvas: HTMLCanvasElement) {
  canvas.style.display = "block";
  canvas.style.pointerEvents = "none";
  canvas.style.userSelect = "none";
}

function surfaceToAppliedCanvasMeta(
  surface: CanvasMetaBehaviorPayload["surface"]
): AppliedCanvasMeta {
  return {
    width: surface.cssWidth,
    height: surface.cssHeight,
    dpr: surface.dpr,
  };
}

export function installCanvasMetaBehavior(
  options: CanvasMetaBehaviorOptions
): CanvasMetaBehaviorPayload {
  const { canvas, definition } = options;
  const meta = createCanvasMeta(definition);

  markCanvasOpen(meta.id, meta.closes);
  applyBaseCanvasStyle(canvas);
  applyZIndex(canvas, meta.zIndex);
  applyCanvasVisibility(canvas, meta.visible);

  function resolveSurfaceCssSize() {
    const size = resolveCanvasSize(canvas, meta.viewportMode);

    return {
      cssWidth: size.width,
      cssHeight: size.height,
    };
  }

  const surfaceReactions: readonly SurfaceReaction[] = [
    {
      id: "canvas-meta.apply-css-size",
      run(signal) {
        if (!isSurfaceLayoutChange(signal)) return;
        applyCanvasCssSize(canvas, {
          width: signal.cssWidth,
          height: signal.cssHeight,
        });
      },
    },
  ];

  const surfaceSignal: InstalledSurfaceSignal = meta.viewportMode.kind === "full-viewport"
    ? installGlobalSurfaceSignal({
        canvasId: meta.id,
        dprMode: meta.dprMode,
        resolveCssSize: resolveSurfaceCssSize,
        reactions: surfaceReactions,
      })
    : installInstancedSurfaceSignal({
        target: meta.viewportMode.kind === "parent" ? canvas.parentElement : null,
        dprMode: meta.dprMode,
        resolveCssSize: resolveSurfaceCssSize,
        reactions: surfaceReactions,
      });

  return {
    meta,
    get applied() {
      return surfaceToAppliedCanvasMeta(surfaceSignal.current);
    },
    get surface() {
      return surfaceSignal.current;
    },
    addSurfaceReaction: surfaceSignal.addReaction,
    cleanup() {
      surfaceSignal.cleanup();
      markCanvasClosed(meta.id);
    },
  };
}
