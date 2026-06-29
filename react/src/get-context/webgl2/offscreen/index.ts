import type { OffscreenApi, OffscreenHandle } from "../../../render-api";

interface OffscreenTarget {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
}

function asHandle(t: OffscreenTarget): OffscreenHandle {
  return t as unknown as OffscreenHandle;
}

function fromHandle(h: OffscreenHandle): OffscreenTarget {
  return h as unknown as OffscreenTarget;
}

const BLIT_VERT = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 pos[3] = vec2[](vec2(-1,-1), vec2(3,-1), vec2(-1,3));
  v_uv = pos[gl_VertexID] * 0.5 + 0.5;
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}`;

const BLIT_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_texture;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  fragColor = texture(u_texture, v_uv);
}`;

export function createOffscreenPipeline(gl: WebGL2RenderingContext): OffscreenApi {
  const vert = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vert, BLIT_VERT);
  gl.compileShader(vert);

  const frag = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(frag, BLIT_FRAG);
  gl.compileShader(frag);

  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  const u_texture = gl.getUniformLocation(program, "u_texture")!;

  return {
    create(pixelWidth, pixelHeight) {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pixelWidth, pixelHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);

      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      return asHandle({ fbo, texture });
    },

    bind(handle) {
      const { fbo } = fromHandle(handle);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },

    unbind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },

    blit(handle) {
      const { texture } = fromHandle(handle);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(u_texture, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },

    destroy(handle) {
      const { fbo, texture } = fromHandle(handle);
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(texture);
    },
  };
}