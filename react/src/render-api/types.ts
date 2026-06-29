export type RenderApiKind = "webgpu" | "webgl2";

export interface RenderSurface {
  cssWidth: number;
  cssHeight: number;
  pixelWidth: number;
  pixelHeight: number;
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ShapeKind = "rect" | "circle" | "ellipse";

export interface DrawShapeOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  color: Rgba;
  kind?: ShapeKind; // defaults to "rect"
}

export interface ParticleInstance {
  x: number;
  y: number;
  size: number;
  color: Rgba;
}

export interface LinearGradientStop {
  position: number;
  rgba: readonly [number, number, number, number];
  holdToNext: boolean;
}

export interface DrawLinearGradientOptions {
  stops: readonly LinearGradientStop[];
}

export interface OffscreenHandle {
  readonly __offscreen: never;
}

export interface OffscreenApi {
  create(pixelWidth: number, pixelHeight: number): OffscreenHandle;
  bind(target: OffscreenHandle): void;
  unbind(): void;
  blit(target: OffscreenHandle): void;
  destroy(target: OffscreenHandle): void;
}

export interface RenderApi {
  readonly kind: RenderApiKind;
  readonly surface: RenderSurface;
  resizeAllocation: (surface: RenderSurface) => void;
  beginFrame: () => void;
  clear: (color: Rgba) => void;
  drawShape: (opts: DrawShapeOptions) => void;
  drawLinearGradient: (opts: DrawLinearGradientOptions) => void;
  drawParticles: (particles: ParticleInstance[]) => void;
  endFrame: () => void;
}