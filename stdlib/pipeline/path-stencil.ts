import type * as motion from "@nahara/motion";
import * as geometry from "@nahara/geometry";
import * as webgpu from "@nahara/webgpu";
import shaderCode from "./path-stencil.wgsl" with { type: "text" };

export const VERTEX_SIZE: number = Float32Array.BYTES_PER_ELEMENT * 2;

export function create(env: motion.graphics.GraphicsEnv): (options: RenderOptions) => void {
    const { device, vertexBufferPool, vertexBufferSize, staging } = env;

    const fillBgLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
        ],
    });
    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            fillBgLayout,
        ],
    });
    const shader = device.createShaderModule({
        code: shaderCode,
    });
    const pipelineCache = new webgpu.Cached<GPUTextureFormat, GPURenderPipeline>({
        factory: (format) => (device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shader,
                entryPoint: "vertexMain",
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
                format,
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
            primitive: {
                topology: "triangle-list",
            },
        })),
    });

    const uniform = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * 16 * 3,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    const fillBg = device.createBindGroup({
        layout: fillBgLayout,
        entries: [
            { binding: 0, resource: { buffer: uniform } },
        ],
    });

    return (options) => {
        const { encoder, stencilFormat, stencilView, projMat, viewMat, modelMat, path: pathList } = options;
        const pipeline = pipelineCache.get(stencilFormat);
        const borrowedVertexBuffers: { handle: webgpu.Borrowed<GPUBuffer>; count: number }[] = [];

        const uniformData = new Float32Array(staging.write(uniform, 0, uniform.size, encoder));
        projMat.setToArray(uniformData, 0);
        viewMat.setToArray(uniformData, 16);
        modelMat.setToArray(uniformData, 32);

        const stream = staging.stream(
            Math.floor(vertexBufferSize / VERTEX_SIZE / 3) * VERTEX_SIZE * 3,
            ({ buffer, offset, size }) => {
                const count = Math.floor(size / VERTEX_SIZE);
                const handle = vertexBufferPool.borrow();
                encoder.copyBufferToBuffer(buffer, offset, handle.resource, 0, size);
                borrowedVertexBuffers.push({ handle, count });
            },
        );

        for (const path of pathList) {
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

        stream.write(VERTEX_SIZE);
        stream.flush();

        const stencilPass = encoder.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: stencilView,
                depthReadOnly: true,
                stencilReadOnly: false,
                stencilLoadOp: "clear",
                stencilStoreOp: "store",
                stencilClearValue: 0x00,
            },
        });

        stencilPass.setPipeline(pipeline);
        stencilPass.setBindGroup(0, fillBg);

        for (const { handle, count } of borrowedVertexBuffers) {
            stencilPass.setVertexBuffer(0, handle.resource, 0, count * VERTEX_SIZE);
            stencilPass.draw(count, 1, 0, 0);
            handle.release();
        }

        stencilPass.end();
    };
}

export interface RenderOptions {
    readonly encoder: GPUCommandEncoder;
    readonly stencilFormat: GPUTextureFormat;
    readonly stencilView: GPUTextureView;
    readonly projMat: motion.math.Matrix4;
    readonly viewMat: motion.math.Matrix4;
    readonly modelMat: motion.math.Matrix4;
    readonly path: Iterable<geometry.path.Path>;
}
