export const GRAD_VERT = /* glsl */ `#version 300 es
void main() {
  vec2 pos[6];
  pos[0] = vec2(-1.0, -1.0); pos[1] = vec2( 1.0, -1.0); pos[2] = vec2(-1.0,  1.0);
  pos[3] = vec2(-1.0,  1.0); pos[4] = vec2( 1.0, -1.0); pos[5] = vec2( 1.0,  1.0);
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}
`;

export const GRAD_FRAG = /* glsl */ `#version 300 es
precision highp float;

const int MAX_STOPS = 16;

uniform vec2 u_resolution;
uniform int u_stopCount;
uniform float u_positions[MAX_STOPS];
uniform vec4 u_colors[MAX_STOPS];
uniform float u_hold[MAX_STOPS];

out vec4 fragColor;

void main() {
  // CSS y: 0 = top, 1 = bottom. WebGL y: 0 = bottom.
  float t = 1.0 - gl_FragCoord.y / u_resolution.y;

  vec4 color = u_colors[0];

  for (int i = 0; i < MAX_STOPS - 1; i++) {
    if (i >= u_stopCount - 1) break;

    float p0 = u_positions[i];
    float p1 = u_positions[i + 1];

    if (t < p0) break;

    if (t <= p1) {
      if (u_hold[i] > 0.5) {
        color = u_colors[i];
      } else {
        float localT = (p1 > p0) ? (t - p0) / (p1 - p0) : 0.0;
        color = mix(u_colors[i], u_colors[i + 1], localT);
      }
      break;
    }

    color = u_colors[i + 1];
  }

  fragColor = color;
}
`;