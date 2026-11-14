@group(0) @binding(0) var<uniform> fill_color: vec4<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
    const vertices = array(
        vec4f(-1.0,  1.0, 0.0, 1.0),
        vec4f( 1.0,  1.0, 0.0, 1.0),
        vec4f(-1.0, -1.0, 0.0, 1.0),
        vec4f( 1.0, -1.0, 0.0, 1.0),
    );
    return vertices[vi];
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
    return fill_color;
}
