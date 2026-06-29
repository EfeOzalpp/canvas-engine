// Uniform buffer layout (64 bytes = 4 × vec4f):
//   [0-15]  resolution: vec4f  — x=cssWidth, y=cssHeight
//   [16-31] rect:       vec4f  — x=posX, y=posY, z=sizeW, w=sizeH  (CSS pixels, top-left origin)
//   [32-47] color:      vec4f  — r, g, b, a (premultiplied)
//   [48-63] shape:      vec4f  — x=kind (0=rect, 1=circle, 2=ellipse)

export const SHAPE_SHADER = /* wgsl */ `
struct Uniforms {
  resolution : vec4f,
  rect       : vec4f,
  color      : vec4f,
  shape      : vec4f,
}

@group(0) @binding(0) var<uniform> u : Uniforms;

struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0)       uv       : vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vi : u32) -> VertexOutput {
  var quad = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
  );
  let uv  = quad[vi];
  let px  = u.rect.xy + uv * u.rect.zw;
  let ndc = vec2f(
    (px.x / u.resolution.x) * 2.0 - 1.0,
    1.0 - (px.y / u.resolution.y) * 2.0,
  );
  var out : VertexOutput;
  out.position = vec4f(ndc, 0.0, 1.0);
  out.uv = uv;
  return out;
}

@fragment
fn fs_main(in : VertexOutput) -> @location(0) vec4f {
  let kind     = u.shape.x;
  let centered = in.uv - vec2f(0.5);

  if kind == 1.0 {
    // circle — equal pixel distance from center
    let pixelDist = length(centered * u.rect.zw);
    let radius    = min(u.rect.z, u.rect.w) * 0.5;
    if pixelDist > radius { discard; }
  } else if kind == 2.0 {
    // ellipse — fills the quad bounding box
    let d = centered * 2.0;
    if dot(d, d) > 1.0 { discard; }
  }

  return u.color;
}
`;