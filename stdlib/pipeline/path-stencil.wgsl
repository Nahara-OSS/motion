struct FillInfo {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
    model: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> fill_info: FillInfo;

@vertex
fn vertexMain(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
    return fill_info.projection * fill_info.view * fill_info.model * vec4<f32>(position, 0.0, 1.0);
}
