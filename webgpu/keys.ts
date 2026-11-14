export function blendComponentKey(data: GPUBlendComponent): string {
    const { operation = "add", srcFactor = "one", dstFactor = "zero" } = data;
    return `${operation}::${srcFactor}::${dstFactor}`;
}

export function blendStateKey(data: GPUBlendState): string {
    const { color, alpha } = data;
    return `${blendComponentKey(color)}::${blendComponentKey(alpha)}`;
}
