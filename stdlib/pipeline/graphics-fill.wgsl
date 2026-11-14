struct FillInfo {
    alpha: f32,
}

@group(0) @binding(0) var<uniform> fill_info: FillInfo;
@group(1) @binding(0) var fill_sampler: sampler;
@group(1) @binding(1) var fill_texture: texture_2d<f32>;

struct VertexOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vi: u32) -> VertexOut {
    const vertices = array(
        VertexOut(vec4f(-1.0,  1.0, 0.0, 1.0), vec2f(0.0, 0.0)),
        VertexOut(vec4f( 1.0,  1.0, 0.0, 1.0), vec2f(1.0, 0.0)),
        VertexOut(vec4f(-1.0, -1.0, 0.0, 1.0), vec2f(0.0, 1.0)),
        VertexOut(vec4f( 1.0, -1.0, 0.0, 1.0), vec2f(1.0, 1.0)),
    );
    return vertices[vi];
}

@fragment
fn fragmentMain(vo: VertexOut) -> @location(0) vec4f {
    let raw = textureSample(fill_texture, fill_sampler, vo.uv);
    return raw * fill_info.alpha;
}
