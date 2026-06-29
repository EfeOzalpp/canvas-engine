export const GRADIENT_SHADER = /* wgsl */ `
struct GradientUniforms {
  resolution : vec2<f32>,
  stopCount  : u32,
  _pad       : u32,
  // 16 stop positions packed 4-per-vec4 to avoid WGSL uniform array stride issues.
  positions  : array<vec4<f32>, 4>,
  colors     : array<vec4<f32>, 16>,
  hold       : array<vec4<f32>, 4>,
}

@group(0) @binding(0) var<uniform> u : GradientUniforms;

@vertex
fn vs_main(@builtin(vertex_index) vi : u32) -> @builtin(position) vec4<f32> {
  var pos = array<vec2<f32>, 6>(
    vec2(-1.0, -1.0), vec2( 1.0, -1.0), vec2(-1.0,  1.0),
    vec2(-1.0,  1.0), vec2( 1.0, -1.0), vec2( 1.0,  1.0),
  );
  return vec4(pos[vi], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
  // pos.y is physical pixels (y=0 at top); resolution is pixelHeight — same space.
  let t     = pos.y / u.resolution.y;
  let count = i32(u.stopCount);
  var color = u.colors[0];

  for (var i = 0; i < 15; i++) {
    if (i >= count - 1) { break; }

    let p0 = u.positions[ i      / 4][ i      % 4];
    let p1 = u.positions[(i + 1) / 4][(i + 1) % 4];
    let h  = u.hold[     i      / 4][ i      % 4];

    if (t < p0) { break; }

    if (t <= p1) {
      if (h > 0.5) {
        color = u.colors[i];
      } else {
        let localT = select(0.0, (t - p0) / (p1 - p0), p1 > p0);
        color = mix(u.colors[i], u.colors[i + 1], localT);
      }
      break;
    }

    color = u.colors[i + 1];
  }

  return color;
}
`;