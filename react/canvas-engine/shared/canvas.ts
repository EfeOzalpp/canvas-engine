// Shape-facing draw surface. Runtime's makeP implements this small p5-like API,
// but the contract lives here so shapes do not depend on runtime internals.
export interface CanvasColor {
  r: number;
  g: number;
  b: number;
}

export interface CanvasDrawSurface {
  canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly deltaTime: number;
  drawingContext: CanvasRenderingContext2D;

  P2D: "2d";
  CORNER: "corner";
  CENTER: "center";
  CLOSE: "close";

  millis(): number;
  createCanvas(w: number, h: number): HTMLCanvasElement;
  resizeCanvas(w: number, h: number): void;
  pixelDensity(dpr: number): void;
  background(css: string): void;

  push(): void;
  pop(): void;
  translate(x: number, y: number): void;
  scale(x: number, y?: number): void;
  rotate(r: number): void;

  noFill(): void;
  fill(r: number | string, g?: number, b?: number, a?: number): void;
  noStroke(): void;
  stroke(r: number, g: number, b: number, a?: number): void;
  strokeWeight(w: number): void;
  rectMode(mode: "corner" | "center"): void;

  rect(x: number, y: number, w: number, h: number, tl?: number, tr?: number, br?: number, bl?: number): void;
  circle(x: number, y: number, d: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void;

  beginShape(): void;
  vertex(x: number, y: number): void;
  endShape(mode?: string): void;

  color(css: string): CanvasColor;
  red(c: CanvasColor): number;
  green(c: CanvasColor): number;
  blue(c: CanvasColor): number;

  __tick(now: number): void;
}
