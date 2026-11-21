import * as webgpu from "@nahara/webgpu";

/**
 * Global environment
 */
export class GlobalEnv implements Disposable {
    /**
     * General purpose cache
     *
     * Unlike caches that are tied to specific environment (like {@link GraphicsEnv.cache}), this general purpose cache
     * will remember cache values until the end of renderer's lifetime. If the cached value is tied to environment (e.g
     * render pipeline), it is better to use environment-specific cache instead.
     */
    readonly cache: webgpu.Cache = new webgpu.Cache();

    beginFrame(): void {
        this.cache.beginCycle();
    }

    endFrame(): void {}

    destroy(): void {
        this.cache.invalidateAll();
    }

    [Symbol.dispose](): void {
        this.destroy();
    }
}

/**
 * Graphics environment
 */
export class GraphicsEnv implements Disposable {
    #debug: string | null;

    /**
     * GPU device
     */
    readonly device: GPUDevice;

    /**
     * Graphics-specific cache
     *
     * This cache should only be used for caching graphics-related objects, such as compiled shaders, pipelines and
     * buffers. Because if the graphics environment encountered failure for some reason (e.g. device lost context), the
     * graphics environment will be recreated. For general purpose cache (which retains cached values even if graphics
     * environment encountered failure), consider use {@link GlobalEnv.cache}.
     */
    readonly cache: webgpu.Cache;

    /**
     * Texture pool
     *
     * Borrowed textures must be released (tip: use `using` keyword) to avoid memory leak.
     */
    readonly texturePool: webgpu.ResourcePool<GPUTexture, TexturePoolOptions>;

    /**
     * Vertex buffer pool
     *
     * Vertex buffers borrowed from this pool always have `VERTEX | COPY_DST` usages, so you can copy vertex data right
     * away (either using `device.queue.writeBuffer` or copy from staging buffer).
     */
    readonly vertexBufferPool: webgpu.ResourcePool<GPUBuffer, void>;
    readonly vertexBufferSize: number;
    readonly staging: webgpu.StagingBelt;

    constructor(options: GraphicsEnvOptions) {
        const {
            device,
            debug = null,
            validate = false,
            stagingChunkSize = 1024 * 1024 * 16,
            vertexBufferSize = 1024 * 1024 * 16,
        } = options;

        this.#debug = debug;
        this.device = device;
        this.vertexBufferSize = vertexBufferSize;

        this.cache = new webgpu.Cache({
            debug: debug == null ? null : `${debug}/cache`,
        });

        this.texturePool = new webgpu.ResourcePool({
            debug: debug == null ? null : `${debug}/texture-pool`,
            validate,
            deriveKey: ({ width, height, format, usage, sampleCount }) => ([
                width,
                height,
                format,
                usage,
                sampleCount,
            ].join("::")),
            factory: ({ width, height, format, usage, sampleCount }) => (device.createTexture({
                label: "Borrowed texture",
                size: { width, height },
                format,
                usage,
                sampleCount,
            })),
            destroy: (texture) => texture.destroy(),
        });

        this.vertexBufferPool = new webgpu.ResourcePool({
            debug: debug == null ? null : `${debug}/vertex-buffer-pool`,
            validate,
            factory: () => (device.createBuffer({
                label: "Borrowed vertex buffer",
                size: vertexBufferSize,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            })),
            destroy: (buffer) => buffer.destroy(),
        });

        this.staging = new webgpu.StagingBelt({
            device,
            chunkSize: stagingChunkSize,
            cap: 128,
        });
    }

    beginFrame(): void {
        if (this.#debug) console.log("%cgraphics %c----- Begin frame -----", "color:rebeccapurple", "");
        this.texturePool.beginCycle();
        this.vertexBufferPool.beginCycle();
        this.cache.beginCycle();
        this.staging.recall();
    }

    endFrame(): void {
        this.texturePool.endCycle();
        this.vertexBufferPool.endCycle();
        this.cache.endCycle();
        this.staging.finish();
        if (this.#debug) console.log("%cgraphics %c----- End frame -----", "color:rebeccapurple", "");
    }

    destroy(): void {
        this.texturePool.destroy();
        this.cache.invalidateAll();
        this.staging.destroy();
    }

    [Symbol.dispose](): void {
        this.destroy();
    }
}

export interface GraphicsEnvOptions {
    readonly debug?: string | null;
    readonly validate?: boolean;
    readonly device: GPUDevice;
    readonly stagingChunkSize?: number;
    readonly vertexBufferSize?: number;
}

export interface TexturePoolOptions {
    readonly width: number;
    readonly height: number;
    readonly format: GPUTextureFormat;
    readonly usage: number;
    readonly sampleCount: number;
}
