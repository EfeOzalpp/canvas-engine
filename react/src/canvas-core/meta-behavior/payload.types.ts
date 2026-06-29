import type {
  SurfaceDprMode,
  SurfaceReaction,
  SurfaceState,
} from "../lifecycle/stable-signals";

export type DprMode = SurfaceDprMode;

export type ViewportMode =
  | { kind: "parent" }
  | { kind: "full-viewport" }
  | { kind: "fixed"; width: number; height: number };

export interface CanvasInstanceMeta {
  id: string;
  dprMode: DprMode;
  viewportMode: ViewportMode;
  fpsCap?: number;
  zIndex: number;
  closes?: readonly string[];
  visible?: boolean;
}

export type CanvasInstanceDefinition = Omit<CanvasInstanceMeta, "zIndex"> & {
  zIndex?: number;
};

export interface AppliedCanvasMeta {
  width: number;
  height: number;
  dpr: number;
}

export interface CanvasMetaBehaviorOptions {
  canvas: HTMLCanvasElement;
  definition: CanvasInstanceDefinition;
}

export interface CanvasMetaBehaviorPayload {
  meta: CanvasInstanceMeta;
  applied: AppliedCanvasMeta;
  surface: SurfaceState;
  addSurfaceReaction: (reaction: SurfaceReaction) => () => void;
  cleanup: () => void;
}
