declare enum GPUTextureUsage {
    COPY_SRC = 0x01,
    COPY_DST = 0x02,
    TEXTURE_BINDING = 0x04,
    STORAGE_BINDING = 0x08,
    RENDER_ATTACHMENT = 0x10,

    /**
     * Mark the texture as transient.
     *
     * Transient textures are only held temporarily in the memory when needed (eg: during the render pass). If this
     * usage is present:
     *
     * - Usage must contains only exactly `RENDER_ATTACHMENT` and `TRANSIENT_ATTACHMENT` bits;
     * - Texture dimension must be `2d`;
     * - Depth/array layers must be 1;
     * - Mip level count must be 1;
     * - Render pass load operation must be `clear`;
     * - Render pass store operation must be `discard`.
     */
    TRANSIENT_ATTACHMENT = 0x20,
}

declare enum GPUBufferUsage {
    MAP_READ = 0x001,
    MAP_WRITE = 0x002,
    COPY_SRC = 0x004,
    COPY_DST = 0x008,
    INDEX = 0x010,
    VERTEX = 0x020,
    UNIFORM = 0x040,
    STORAGE = 0x080,
    INDIRECT = 0x100,
    QUERY_RESOLVE = 0x200,
}

declare enum GPUShaderStage {
    VERTEX = 0x01,
    FRAGMENT = 0x02,
    COMPUTE = 0x04,
}

declare enum GPUMapMode {
    READ = 0x01,
    WRITE = 0x02,
}
