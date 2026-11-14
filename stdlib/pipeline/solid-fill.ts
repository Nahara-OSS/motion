import type * as motion from "@nahara/motion";
import * as webgpu from "@nahara/webgpu";
import shaderCode from "./solid-fill.wgsl" with { type: "text" };

export function create(env: motion.graphics.GraphicsEnv): (options: RenderOptions) => void {
    const { device, staging } = env;

    const fillInfoBgLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        ],
    });
    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            fillInfoBgLayout,
        ],
    });
    const shader = device.createShaderModule({
        code: shaderCode,
    });
    const pipelineCache = new webgpu.Cached<
        {
            colorFormat: GPUTextureFormat;
            stencil?: { format: GPUTextureFormat; winding: NonNullable<RenderOptions["stencilTexture"]>["winding"] };
            blend: GPUBlendState;
        },
        GPURenderPipeline
    >({
        deriveKey: ({ colorFormat, stencil, blend }) => {
            const stencilKey = stencil == null ? "<no-stencil>" : `${stencil.format}::${stencil.winding}`;
            return `${webgpu.blendStateKey(blend)}::${colorFormat}::${stencilKey}`;
        },
        factory: ({ colorFormat, stencil, blend }) => (device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shader,
                entryPoint: "vertexMain",
            },
            fragment: {
                module: shader,
                entryPoint: "fragmentMain",
                targets: [{ format: colorFormat, blend }],
            },
            depthStencil: stencil == null ? undefined : {
                format: stencil.format,
                depthWriteEnabled: false,
                stencilReadMask: stencil.winding == "non-zero" ? 0xFF : 0x01,
                stencilWriteMask: 0x00,
                stencilBack: {
                    compare: "not-equal",
                    depthFailOp: "keep",
                    failOp: "keep",
                    passOp: "keep",
                },
                stencilFront: {
                    compare: "not-equal",
                    depthFailOp: "keep",
                    failOp: "keep",
                    passOp: "keep",
                },
            },
            primitive: {
                topology: "triangle-strip",
            },
        })),
    });

    const fillInfo = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const fillInfoBg = device.createBindGroup({
        layout: fillInfoBgLayout,
        entries: [
            { binding: 0, resource: { buffer: fillInfo } },
        ],
    });

    return (options) => {
        const { encoder, colorTexture, stencilTexture, blendState, color } = options;

        const uniformData = new Float32Array(staging.write(fillInfo, 0, fillInfo.size, encoder));
        uniformData[0] = color[0];
        uniformData[1] = color[1];
        uniformData[2] = color[2];
        uniformData[3] = color[3];

        const pipeline = pipelineCache.get({
            colorFormat: colorTexture.format,
            stencil: stencilTexture == null
                ? undefined
                : { format: stencilTexture.format, winding: stencilTexture.winding },
            blend: blendState,
        });
        const fillPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: colorTexture.view,
                    loadOp: "load",
                    storeOp: "store",
                },
            ],
            depthStencilAttachment: stencilTexture == null ? undefined : {
                view: stencilTexture.view,
                depthReadOnly: true,
                stencilReadOnly: true,
            },
        });
        fillPass.setPipeline(pipeline);
        fillPass.setBindGroup(0, fillInfoBg);
        fillPass.draw(4, 1, 0, 0);
        fillPass.end();
    };
}

export interface RenderOptions {
    readonly encoder: GPUCommandEncoder;

    readonly colorTexture: {
        readonly format: GPUTextureFormat;
        readonly view: GPUTextureView;
    };

    /**
     * Stencil texture to use as fill mask
     *
     * If this option is not provided, stencil testing will be disabled
     */
    readonly stencilTexture?: {
        readonly format: GPUTextureFormat;
        readonly view: GPUTextureView;
        readonly winding: "non-zero" | "even-odd";
    };

    readonly blendState: GPUBlendState;
    readonly color: readonly [r: number, g: number, b: number, a: number];
}
