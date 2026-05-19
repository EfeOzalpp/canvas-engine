export interface RGBA {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface ParticleRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ParticleRange {
  min?: number;
  max?: number;
}

export interface ParticleSpawnArea {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

export interface ParticleAccel {
  x?: number;
  y?: number;
}

export interface ParticleJitter {
  pos?: number;
  velAngle?: number;
}

export interface ParticleEdgeFade {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export type ParticleSpawnMode = "random" | "stratified";
export type RandomSource = () => number;

// Small drawing surface used by the particle systems. The real p-like engine has more methods.
export interface ParticleCanvas {
  push(): void;
  pop(): void;
  noStroke(): void;
  fill(r: number, g: number, b: number, a?: number): void;
  circle(x: number, y: number, d: number): void;
  strokeWeight(w: number): void;
  stroke(r: number, g: number, b: number, a?: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
}
