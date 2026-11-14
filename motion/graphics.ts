import * as webgpu from "@nahara/webgpu";

/**
 * Graphics environment
 *
 * - {@link GraphicsEnv.beginFrame} must be called after the previous command buffer is submitted and before any
 *   resources in graphics environment is used.
 * - {@link GraphicsEnv.endFrame} must be called after commands are encoded and before the command buffer is submitted.
 */
export class GraphicsEnv implements Disposable {
    readonly device: GPUDevice;
    readonly texturePool: webgpu.ResourcePool<GPUTexture, TexturePoolOptions>;
    readonly vertexBufferPool: webgpu.ResourcePool<GPUBuffer, void>;
    readonly vertexBufferSize: number;
    readonly staging: webgpu.StagingBelt;

    constructor(options: GraphicsEnvOptions) {
        const {
            device,
            stagingChunkSize = 1024 * 1024 * 16,
            vertexBufferSize = 1024 * 1024 * 16,
        } = options;

        this.device = device;
        this.vertexBufferSize = vertexBufferSize;

        this.texturePool = new webgpu.ResourcePool({
            deriveKey: ({ width, height, format, usage }) => `${width}::${height}::${format}::${usage}`,
            factory: ({ width, height, format, usage }) => (device.createTexture({
                label: "Borrowed texture",
                size: { width, height },
                format,
                usage,
            })),
            destroy: (texture) => texture.destroy(),
        });

        this.vertexBufferPool = new webgpu.ResourcePool({
            factory: () => (device.createBuffer({
                label: "Borrowed vertex buffer",
                size: vertexBufferSize,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            })),
        });

        this.staging = new webgpu.StagingBelt({
            device,
            chunkSize: stagingChunkSize,
        });
    }

    beginFrame(): void {
        this.texturePool.cycle();
        this.staging.recall();
    }

    endFrame(): void {
        this.staging.finish();
    }

    destroy(): void {
        this.texturePool.destroy();
    }

    [Symbol.dispose](): void {
        this.destroy();
    }
}

export interface GraphicsEnvOptions {
    readonly device: GPUDevice;
    readonly stagingChunkSize?: number;
    readonly vertexBufferSize?: number;
}

export interface TexturePoolOptions {
    readonly width: number;
    readonly height: number;
    readonly format: GPUTextureFormat;
    readonly usage: number;
}

export interface VertexStream {
    readonly pushChunk: () => ArrayBuffer;
    readonly finish: () => webgpu.Borrowed<GPUBuffer[]>;
}
