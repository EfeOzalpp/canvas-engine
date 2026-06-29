import { useEffect, useRef } from "react";

import { installCanvasMetaBehavior, type CanvasInstanceDefinition } from "../meta-behavior";
import { applyCanvasVisibility, applyZIndex } from "../meta-behavior/instance-meta";
import { getRenderContext, type RenderContext, type RenderContextPreference } from "../../get-context";
import { assertValidCanvasId } from "../../errors";
import { createCanvasLoop } from "./render-loop";
import {
  pauseFrameScheduler,
  registerCanvasFrame,
  resumeFrameScheduler,
  updateCanvasFrame,
} from "./raf-scheduler";
import type { GpuLifetimeReaction } from "./stable-signals";

interface CanvasInstanceProps extends CanvasInstanceDefinition {
  renderer?: RenderContextPreference;
}

export function CanvasInstance({
  id,
  dprMode,
  viewportMode,
  fpsCap,
  zIndex,
  closes,
  visible,
  renderer = "auto",
}: CanvasInstanceProps) {
  assertValidCanvasId(id);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep latest dynamic values readable by the stable effect at registration time.
  const zIndexRef = useRef(zIndex);
  const fpsCapRef = useRef(fpsCap);
  zIndexRef.current = zIndex;
  fpsCapRef.current = fpsCap;

  const viewportModeKey = viewportMode.kind === "fixed"
    ? `fixed:${viewportMode.width}x${viewportMode.height}`
    : viewportMode.kind;

  // Stable effect — only restarts when canvas identity or renderer backend changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let renderContext: RenderContext | null = null;
    let loop: ReturnType<typeof createCanvasLoop> | null = null;
    let unregisterFrame: (() => void) | null = null;
    const gpuPauseReason = `gpu-lost:${id}`;

    const metaBehaviorPayload = installCanvasMetaBehavior({
      canvas,
      definition: { id, dprMode, viewportMode, fpsCap: fpsCapRef.current, zIndex: zIndexRef.current ?? 0, closes, visible },
    });

    void getRenderContext({
      canvas,
      preference: renderer,
      surface: metaBehaviorPayload.surface,
      gpuLifetimeReactions: [
        {
          id: "canvas-instance.pause-raf-on-gpu-lost",
          run(signal) {
            if (signal.type === "gpu-lost") {
              pauseFrameScheduler(gpuPauseReason);
              return;
            }
            if (signal.type === "gpu-restored" || signal.type === "gpu-disposed") {
              resumeFrameScheduler(gpuPauseReason);
            }
          },
        },
        {
          id: "canvas-instance.report-gpu-restore-failed",
          run(signal) {
            if (signal.type !== "gpu-restore-failed") return;
            console.error(`[canvas-engine] GPU restore failed for ${id}`, signal.error);
          },
        },
      ] satisfies readonly GpuLifetimeReaction[],
    }).then((createdContext) => {
      if (disposed) {
        createdContext.dispose();
        return;
      }

      renderContext = createdContext;
      renderContext.resizeAllocation(metaBehaviorPayload.surface);

      loop = createCanvasLoop({
        id,
        renderContext,
        addSurfaceReaction: metaBehaviorPayload.addSurfaceReaction,
        getSurface: () => metaBehaviorPayload.surface,
      });

      // Read from refs so dynamic updates that arrived before context was ready are respected.
      unregisterFrame = registerCanvasFrame(id, loop.tick, {
        priority: zIndexRef.current ?? 0,
        fpsCap: fpsCapRef.current,
      });
    }).catch((error: unknown) => {
      console.error(`[canvas-engine] Failed to create renderer for ${id}`, error);
    });

    return () => {
      disposed = true;
      unregisterFrame?.();
      loop?.stop();
      renderContext?.dispose();
      resumeFrameScheduler(gpuPauseReason);
      metaBehaviorPayload.cleanup();
    };

  }, [id, dprMode, viewportModeKey, closes, renderer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dynamic: visible — no context restart needed.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    applyCanvasVisibility(canvas, visible);
  }, [visible]);

  // Dynamic: zIndex — update DOM and scheduler priority.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    applyZIndex(canvas, zIndex ?? 0);
    updateCanvasFrame(id, { priority: zIndex ?? 0 });
  }, [id, zIndex]);

  // Dynamic: fpsCap — update scheduler cap only.
  useEffect(() => {
    updateCanvasFrame(id, { fpsCap });
  }, [id, fpsCap]);

  return (
    <canvas
      ref={canvasRef}
      data-canvas-id={id}
    />
  );
}