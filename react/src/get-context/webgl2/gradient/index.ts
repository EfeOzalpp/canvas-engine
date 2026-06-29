import type { DrawLinearGradientOptions, RenderSurface } from "../../../render-api";
import { GRAD_VERT, GRAD_FRAG } from "./shaders";

const MAX_STOPS = 16;

export interface GradientPipeline {
  drawLinearGradient(surface: RenderSurface, opts: DrawLinearGradientOptions): void;
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`WebGL2 gradient shader error: ${gl.getShaderInfoLog(shader) ?? ""}`);
  }
  return shader;
}

export function createGradientPipeline(gl: WebGL2RenderingContext): GradientPipeline {
  const vert = compileShader(gl, gl.VERTEX_SHADER, GRAD_VERT);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, GRAD_FRAG);

  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`WebGL2 gradient link error: ${gl.getProgramInfoLog(program) ?? ""}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  const vao = gl.createVertexArray()!;

  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_stopCount  = gl.getUniformLocation(program, "u_stopCount");
  const u_positions  = gl.getUniformLocation(program, "u_positions");
  const u_colors     = gl.getUniformLocation(program, "u_colors");
  const u_hold       = gl.getUniformLocation(program, "u_hold");

  const positions = new Float32Array(MAX_STOPS);
  const colors    = new Float32Array(MAX_STOPS * 4);
  const hold      = new Float32Array(MAX_STOPS);

  return {
    drawLinearGradient(surface: RenderSurface, opts: DrawLinearGradientOptions) {
      const count = Math.min(opts.stops.length, MAX_STOPS);

      for (let i = 0; i < count; i++) {
        const s = opts.stops[i];
        positions[i]      = s.position;
        colors[i * 4]     = s.rgba[0];
        colors[i * 4 + 1] = s.rgba[1];
        colors[i * 4 + 2] = s.rgba[2];
        colors[i * 4 + 3] = s.rgba[3];
        hold[i]           = s.holdToNext ? 1.0 : 0.0;
      }

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.uniform2f(u_resolution, surface.pixelWidth, surface.pixelHeight);
      gl.uniform1i(u_stopCount, count);
      gl.uniform1fv(u_positions, positions);
      gl.uniform4fv(u_colors, colors);
      gl.uniform1fv(u_hold, hold);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.bindVertexArray(null);
    },
  };
}