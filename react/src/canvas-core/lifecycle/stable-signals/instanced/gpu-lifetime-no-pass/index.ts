import { runLifecycleReactions, type LifecycleReaction } from "../../../reactions";

export type GpuContextKind = "webgpu" | "webgl2";

export interface GpuLifetimeSignalBase {
  canvas: HTMLCanvasElement;
  contextKind: GpuContextKind;
}

export interface GpuContextLostSignal extends GpuLifetimeSignalBase {
  type: "gpu-lost";
  reason?: string;
  message?: string;
}

export interface GpuContextRestoredSignal extends GpuLifetimeSignalBase {
  type: "gpu-restored";
}

export interface GpuContextRestoreFailedSignal extends GpuLifetimeSignalBase {
  type: "gpu-restore-failed";
  error: unknown;
}

export interface GpuContextDisposedSignal extends GpuLifetimeSignalBase {
  type: "gpu-disposed";
}

export type GpuLifetimeSignal =
  | GpuContextLostSignal
  | GpuContextRestoredSignal
  | GpuContextRestoreFailedSignal
  | GpuContextDisposedSignal;

export type GpuLifetimeReaction = LifecycleReaction<GpuLifetimeSignal>;

export function emitGpuLifetimeSignal(
  reactions: readonly GpuLifetimeReaction[] | undefined,
  signal: GpuLifetimeSignal
) {
  if (!reactions || reactions.length === 0) return;
  runLifecycleReactions(reactions, signal);
}