export interface Vertex {
  x: number;
  y: number;
}

export interface CompiledRectangle {
  kind: "rectangle";
  points: Record<string, Vertex>;
}
