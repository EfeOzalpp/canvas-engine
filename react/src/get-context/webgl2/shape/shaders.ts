export const SHAPE_VERT = /* glsl */ `#version 300 es
uniform vec2 u_resolution;
uniform vec4 u_rect;

out vec2 v_uv;

void main() {
  vec2 quad[6];
  quad[0] = vec2(0.0, 0.0); quad[1] = vec2(1.0, 0.0); quad[2] = vec2(0.0, 1.0);
  quad[3] = vec2(0.0, 1.0); quad[4] = vec2(1.0, 0.0); quad[5] = vec2(1.0, 1.0);

  vec2 uv  = quad[gl_VertexID];
  vec2 px  = u_rect.xy + uv * u_rect.zw;
  vec2 ndc = vec2(
    (px.x / u_resolution.x) * 2.0 - 1.0,
    1.0 - (px.y / u_resolution.y) * 2.0
  );
  gl_Position = vec4(ndc, 0.0, 1.0);
  v_uv = uv;
}
`;

export const SHAPE_FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec4 u_color;
uniform vec4 u_rect;
uniform float u_kind;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 centered = v_uv - vec2(0.5);

  if (u_kind == 1.0) {
    float pixelDist = length(centered * u_rect.zw);
    float radius    = min(u_rect.z, u_rect.w) * 0.5;
    if (pixelDist > radius) discard;
  } else if (u_kind == 2.0) {
    vec2 d = centered * 2.0;
    if (dot(d, d) > 1.0) discard;
  }

  fragColor = u_color;
}
`;