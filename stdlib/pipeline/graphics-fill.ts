import type * as motion from "@nahara/motion";
import * as webgpu from "@nahara/webgpu";
import shaderCode from "./graphics-fill.wgsl" with { type: "text" };

export function create(env: motion.graphics.GraphicsEnv): (options: RenderOptions) => void {
    const { device, staging } = env;

    const fillInfoBgLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        ],
    });
    const sourceBgLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        ],
    });
    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
            fillInfoBgLayout,
            sourceBgLayout,
        ],
    });
    const shader = device.createShaderModule({
        code: shaderCode,
    });
    const pipelineCache = new webgpu.Cached<
        {
            colorFormat: GPUTextureFormat;
            stencilFormat: GPUTextureFormat;
            blend: GPUBlendState;
            winding: RenderOptions["winding"];
        },
        GPURenderPipeline
    >({
        deriveKey: ({ colorFormat, stencilFormat, blend, winding }) => {
            return `${colorFormat}::${stencilFormat}::${webgpu.blendStateKey(blend)}::${winding}`;
        },
        factory: ({ colorFormat, stencilFormat, blend, winding }) => (device.createRenderPipeline({
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
            depthStencil: {
                format: stencilFormat,
                depthWriteEnabled: false,
                stencilReadMask: winding == "non-zero" ? 0xFF : 0x01,
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
        size: Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const fillInfoBg = device.createBindGroup({
        layout: fillInfoBgLayout,
        entries: [
            { binding: 0, resource: { buffer: fillInfo } },
        ],
    });

    const sourceSampler = device.createSampler({
        minFilter: "linear",
        magFilter: "nearest",
    });

    return (options) => {
        const { encoder, colorFormat, stencilFormat, colorView, stencilView, winding, blendState, sourceView, alpha } =
            options;

        const uniformData = new Float32Array(staging.write(fillInfo, 0, fillInfo.size, encoder));
        uniformData[0] = alpha;

        const sourceBg = device.createBindGroup({
            layout: sourceBgLayout,
            entries: [
                { binding: 0, resource: sourceSampler },
                { binding: 1, resource: sourceView },
            ],
        });

        const pipeline = pipelineCache.get({ colorFormat, stencilFormat, blend: blendState, winding });
        const fillPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: colorView,
                    loadOp: "load",
                    storeOp: "store",
                },
            ],
            depthStencilAttachment: {
                view: stencilView,
                depthReadOnly: true,
                stencilReadOnly: true,
            },
        });
        fillPass.setPipeline(pipeline);
        fillPass.setBindGroup(0, fillInfoBg);
        fillPass.setBindGroup(1, sourceBg);
        fillPass.draw(4, 1, 0, 0);
        fillPass.end();
    };
}

export interface RenderOptions {
    readonly encoder: GPUCommandEncoder;
    readonly colorFormat: GPUTextureFormat;
    readonly stencilFormat: GPUTextureFormat;
    readonly colorView: GPUTextureView;
    readonly stencilView: GPUTextureView;
    readonly winding: "non-zero" | "even-odd";
    readonly blendState: GPUBlendState;
    readonly sourceView: GPUTextureView;
    readonly alpha: number;
}
