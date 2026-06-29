import { emitRenderContextDisposed } from "../lifetime-events";
import type { GetRenderContextOptions, RenderContext } from "../types";
import type { DrawShapeOptions, DrawLinearGradientOptions, ParticleInstance, RenderSurface } from "../../render-api";
import { installWebGL2LifetimeGuard } from "./lifetime";
import { createShapePipeline, type ShapePipeline } from "./shape";
import { createGradientPipeline, type GradientPipeline } from "./gradient";
import { createOffscreenPipeline } from "./offscreen";

const WEBGL2_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  antialias: true,
  depth: true,
  premultipliedAlpha: true,
};

export function createWebGL2Context(options: GetRenderContextOptions): RenderContext {
  const { canvas } = options;
  const gl = canvas.getContext("webgl2", WEBGL2_CONTEXT_ATTRIBUTES);

  if (!gl) throw new Error("WebGL2 is not available for this canvas.");

  let status: RenderContext["status"] = "ready";
  let disposed = false;
  let webgl = gl;
  let shapePipeline: ShapePipeline = createShapePipeline(gl);
  const gradientPipeline: GradientPipeline = createGradientPipeline(gl);
  const offscreenPipeline = createOffscreenPipeline(gl);
  let surface: RenderSurface = {
    cssWidth: canvas.clientWidth || 1,
    cssHeight: canvas.clientHeight || 1,
    pixelWidth: canvas.width || 1,
    pixelHeight: canvas.height || 1,
  };

  function applyViewport() {
    if (status !== "ready") return;
    webgl.viewport(0, 0, canvas.width, canvas.height);
  }

  const cleanupLifetimeGuard = installWebGL2LifetimeGuard({
    canvas,
    contextAttributes: WEBGL2_CONTEXT_ATTRIBUTES,
    renderOptions: options,
    getDisposed() { return disposed; },
    setStatus(nextStatus) { status = nextStatus; },
    setContext(nextContext) { webgl = nextContext; },
    applyViewport,
  });

  applyViewport();

  return {
    kind: "webgl2",
    get status() { return status; },
    get surface() { return surface; },
    canvas,
    offscreen: offscreenPipeline,
    resizeAllocation(nextSurface: RenderSurface) {
      canvas.width = Math.max(1, nextSurface.pixelWidth);
      canvas.height = Math.max(1, nextSurface.pixelHeight);
      surface = nextSurface;
      applyViewport();
    },
    beginFrame() {
      if (status !== "ready") return;
      webgl.enable(webgl.BLEND);
      webgl.blendFuncSeparate(webgl.SRC_ALPHA, webgl.ONE_MINUS_SRC_ALPHA, webgl.ONE, webgl.ONE_MINUS_SRC_ALPHA);
    },
    clear(color) {
      if (status !== "ready") return;
      webgl.clearColor(color.r, color.g, color.b, color.a);
      webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);
    },
    drawShape(opts: DrawShapeOptions) {
      if (status !== "ready") return;
      shapePipeline.drawShape(surface, opts);
    },
    drawLinearGradient(opts: DrawLinearGradientOptions) {
      if (status !== "ready") return;
      gradientPipeline.drawLinearGradient(surface, opts);
    },
    drawParticles(_particles: ParticleInstance[]) {
      // TODO: WebGL2 particle instanced draw
    },
    endFrame() {},
    dispose() {
      disposed = true;
      status = "disposed";
      cleanupLifetimeGuard();
      emitRenderContextDisposed(options, canvas, "webgl2");
      webgl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}