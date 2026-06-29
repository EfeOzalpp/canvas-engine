import {
  emitRenderContextLost,
  emitRenderContextRestored,
  emitRenderContextRestoreFailed,
} from "../lifetime-events";
import type { GetRenderContextOptions, RenderContext } from "../types";

function getWebGLContextLostMessage(event: Event): string | undefined {
  return "statusMessage" in event && typeof event.statusMessage === "string"
    ? event.statusMessage
    : undefined;
}

export interface InstallWebGL2LifetimeGuardOptions {
  canvas: HTMLCanvasElement;
  contextAttributes: WebGLContextAttributes;
  renderOptions: GetRenderContextOptions;
  getDisposed: () => boolean;
  setStatus: (status: RenderContext["status"]) => void;
  setContext: (context: WebGL2RenderingContext) => void;
  applyViewport: () => void;
}

export function installWebGL2LifetimeGuard(
  options: InstallWebGL2LifetimeGuardOptions
): () => void {
  const {
    canvas,
    contextAttributes,
    renderOptions,
    getDisposed,
    setStatus,
    setContext,
    applyViewport,
  } = options;

  function onContextLost(event: Event) {
    event.preventDefault();
    if (getDisposed()) return;

    setStatus("lost");
    emitRenderContextLost(renderOptions, {
      type: "gpu-lost",
      canvas,
      contextKind: "webgl2",
      message: getWebGLContextLostMessage(event),
    });
  }

  function onContextRestored() {
    if (getDisposed()) return;

    setStatus("restoring");
    try {
      const restored = canvas.getContext("webgl2", contextAttributes);

      if (!restored) {
        throw new Error("WebGL2 context restore returned null.");
      }

      setContext(restored);
      setStatus("ready");
      applyViewport();

      void emitRenderContextRestored(renderOptions, {
        type: "gpu-restored",
        canvas,
        contextKind: "webgl2",
      });
    } catch (error: unknown) {
      setStatus("restore-failed");
      emitRenderContextRestoreFailed(renderOptions, {
        type: "gpu-restore-failed",
        canvas,
        contextKind: "webgl2",
        error,
      });
    }
  }

  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  return () => {
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
  };
}
