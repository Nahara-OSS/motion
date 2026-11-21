import type * as motion from "@nahara/motion";
import * as geometry from "@nahara/geometry";
import * as webgpu from "@nahara/webgpu";
import shaderCode from "./path-stencil.wgsl" with { type: "text" };

export const VERTEX_SIZE: number = Float32Array.BYTES_PER_ELEMENT * 2;

export interface PathStencilRenderOptions {
    readonly encoder: GPUCommandEncoder;
    readonly stencil: {
        readonly format: GPUTextureFormat;
        readonly view: GPUTextureView;
    };
    readonly transform: {
        readonly proj: motion.math.Matrix4;
        readonly view: motion.math.Matrix4;
        readonly model: motion.math.Matrix4;
    };
    readonly paths: Iterable<geometry.path.Path>;
}

export class PathStencil implements Disposable {
    #cache = new webgpu.Cache();
    #shader: GPUShaderModule;
    #uniform: GPUBuffer;
    #pipelineLayout: GPUPipelineLayout;
    #bindGroup: GPUBindGroup;

    constructor(public graphics: motion.env.GraphicsEnv) {
        const {
            shaders: { main: shader },
            buffers: { uniform },
            pipelineLayouts: { main: pipelineLayout },
            bindGroups: { main: bindGroup },
        } = webgpu.createAndLinkResources({
            device: graphics.device,
            shaders: {
                main: { code: shaderCode },
            },
            buffers: {
                uniform: {
                    size: Float32Array.BYTES_PER_ELEMENT * 16 * 3,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                },
            },
            bindGroupLayouts: {
                main: {
                    entries: [
                        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
                    ],
                },
            },
            bindGroups: {
                main: ({ bindGroupLayouts, buffers }) => ({
                    layout: bindGroupLayouts.main,
                    entries: [
                        { binding: 0, resource: { buffer: buffers.uniform } },
                    ],
                }),
            },
            pipelineLayouts: {
                main: ({ bindGroupLayouts }) => ({
                    bindGroupLayouts: [
                        bindGroupLayouts.main,
                    ],
                }),
            },
        });

        this.#shader = shader;
        this.#uniform = uniform;
        this.#pipelineLayout = pipelineLayout;
        this.#bindGroup = bindGroup;
    }

    render(options: PathStencilRenderOptions): void {
        const { encoder, stencil, transform, paths } = options;
        const { device, staging, vertexBufferSize, vertexBufferPool } = this.graphics;
        const pipeline = this.#cache.get({
            key: [stencil.view].join("::"),
            factory: () => (device.createRenderPipeline({
                layout: this.#pipelineLayout,
                primitive: {
                    topology: "triangle-list",
                },
                vertex: {
                    module: this.#shader,
                    buffers: [
                        {
                            stepMode: "vertex",
                            arrayStride: VERTEX_SIZE,
                            attributes: [
                                { shaderLocation: 0, offset: 0, format: "float32x2" },
                            ],
                        },
                    ],
                },
                depthStencil: {
                    format: stencil.format,
                    depthCompare: "always",
                    depthWriteEnabled: false,
                    stencilReadMask: 0xFF,
                    stencilWriteMask: 0xFF,
                    stencilBack: {
                        compare: "always",
                        depthFailOp: "keep",
                        failOp: "keep",
                        passOp: "decrement-wrap",
                    },
                    stencilFront: {
                        compare: "always",
                        depthFailOp: "keep",
                        failOp: "keep",
                        passOp: "increment-wrap",
                    },
                },
            })),
        });

        const borrowedVertexBuffers: { handle: webgpu.Borrowed<GPUBuffer>; count: number }[] = [];
        const uniformData = new Float32Array(staging.write(this.#uniform, 0, this.#uniform.size, encoder));
        transform.proj.setToArray(uniformData, 0);
        transform.view.setToArray(uniformData, 16);
        transform.model.setToArray(uniformData, 32);

        const stream = staging.stream(
            Math.floor(vertexBufferSize / VERTEX_SIZE / 3) * VERTEX_SIZE * 3,
            ({ buffer, offset, size }) => {
                const count = Math.floor(size / VERTEX_SIZE);
                const handle = vertexBufferPool.borrow();
                encoder.copyBufferToBuffer(buffer, offset, handle.resource, 0, size);
                borrowedVertexBuffers.push({ handle, count });
            },
        );

        for (const path of paths) {
            const bounds = geometry.path.boundsOf(path);
            const center: geometry.Vec2 = [(bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2];

            for (let i = 0; i < path.segments.length; i++) {
                const { start, end } = path.segments[i];
                const data = new Float32Array(stream.write(VERTEX_SIZE * 3));
                data[0] = center[0];
                data[1] = center[1];
                data[2] = start[0];
                data[3] = start[1];
                data[4] = end[0];
                data[5] = end[1];
            }

            // we are filling; close the path automatically
            const data = new Float32Array(stream.write(VERTEX_SIZE * 3));
            data[0] = center[0];
            data[1] = center[1];
            data[2] = path.segments[path.segments.length - 1].end[0];
            data[3] = path.segments[path.segments.length - 1].end[1];
            data[4] = path.segments[0].start[0];
            data[5] = path.segments[0].start[1];
        }

        stream.flush();

        const stencilPass = encoder.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: stencil.view,
                depthReadOnly: true,
                stencilReadOnly: false,
                stencilLoadOp: "clear",
                stencilStoreOp: "store",
                stencilClearValue: 0x00,
            },
        });

        stencilPass.setPipeline(pipeline);
        stencilPass.setBindGroup(0, this.#bindGroup);

        for (const { handle, count } of borrowedVertexBuffers) {
            stencilPass.setVertexBuffer(0, handle.resource, 0, count * VERTEX_SIZE);
            stencilPass.draw(count, 1, 0, 0);
            handle.release();
        }

        stencilPass.end();
    }

    static cache(graphics: motion.env.GraphicsEnv): PathStencil {
        return graphics.cache.get({
            key: PathStencil,
            factory: () => new PathStencil(graphics),
            cycle: (x) => x.beginCycle(),
            destroy: (x) => x.destroy(),
        });
    }

    beginCycle(): void {
        this.#cache.beginCycle();
    }

    destroy(): void {
        this.#cache.invalidateAll();
        this.#uniform.destroy();
    }

    [Symbol.dispose](): void {
        this.destroy();
    }
}
