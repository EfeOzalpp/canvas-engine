import type { DrawShapeOptions, RenderSurface } from "../../../render-api";
import { SHAPE_VERT, SHAPE_FRAG } from "./shaders";

export interface ShapePipeline {
  drawShape: (surface: RenderSurface, opts: DrawShapeOptions) => void;
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`WebGL2 shape shader error: ${gl.getShaderInfoLog(shader) ?? ""}`);
  }
  return shader;
}

export function createShapePipeline(gl: WebGL2RenderingContext): ShapePipeline {
  const vert = compileShader(gl, gl.VERTEX_SHADER, SHAPE_VERT);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, SHAPE_FRAG);

  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`WebGL2 shape link error: ${gl.getProgramInfoLog(program) ?? ""}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  const u_resolution = gl.getUniformLocation(program, "u_resolution")!;
  const u_rect       = gl.getUniformLocation(program, "u_rect")!;
  const u_color      = gl.getUniformLocation(program, "u_color")!;
  const u_kind       = gl.getUniformLocation(program, "u_kind")!;

  const vao = gl.createVertexArray()!;

  return {
    drawShape(surface: RenderSurface, opts: DrawShapeOptions) {
      const kind = opts.kind === "circle" ? 1 : opts.kind === "ellipse" ? 2 : 0;

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.uniform2f(u_resolution, surface.cssWidth, surface.cssHeight);
      gl.uniform4f(u_rect, opts.x, opts.y, opts.w, opts.h);
      gl.uniform4f(u_color, opts.color.r, opts.color.g, opts.color.b, opts.color.a);
      gl.uniform1f(u_kind, kind);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.bindVertexArray(null);
    },
  };
}