import type {
  GpuContextKind,
  GpuContextLostSignal,
  GpuContextRestoredSignal,
  GpuLifetimeReaction,
  SurfaceState,
} from "../canvas-core/lifecycle/stable-signals";
import type { RenderApi, OffscreenApi } from "../render-api";

export type RenderContextPreference = "auto" | "webgpu" | "webgl2";

export type RenderContextKind = GpuContextKind;

export type RenderContextStatus =
  | "ready"
  | "lost"
  | "restoring"
  | "restore-failed"
  | "disposed";

export interface RenderResourceLifecycle {
  discard: (signal: GpuContextLostSignal) => void;
  rehydrate: (signal: GpuContextRestoredSignal) => void | Promise<void>;
}

export interface RenderContext extends RenderApi {
  kind: RenderContextKind;
  readonly status: RenderContextStatus;
  canvas: HTMLCanvasElement;
  offscreen?: OffscreenApi;
  dispose: () => void;
}

export interface GetRenderContextOptions {
  canvas: HTMLCanvasElement;
  preference?: RenderContextPreference;
  surface: SurfaceState;
  gpuLifetimeReactions?: readonly GpuLifetimeReaction[];
  resourceLifecycle?: RenderResourceLifecycle;
}
