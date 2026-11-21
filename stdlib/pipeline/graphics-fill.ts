import type * as motion from "@nahara/motion";
import * as webgpu from "@nahara/webgpu";
import shaderCode from "./graphics-fill.wgsl" with { type: "text" };

export interface GraphicsFillRenderOptions {
    readonly encoder: GPUCommandEncoder;
    readonly target: {
        readonly format: GPUTextureFormat;
        readonly view: GPUTextureView;
    };
    readonly stencil?: {
        readonly format: GPUTextureFormat;
        readonly view: GPUTextureView;
        readonly rule: "even-odd" | "non-zero";
    };
    readonly blendState: GPUBlendState;
    readonly source: GPUTextureView;
    readonly opacity: number;
}

export class GraphicsFill implements Disposable {
    #cache = new webgpu.Cache();
    #shader: GPUShaderModule;
    #uniform: GPUBuffer;
    #sampler: GPUSampler;
    #pipelineLayout: GPUPipelineLayout;
    #infoBindGroup: GPUBindGroup;
    #sourceBindGroupLayout: GPUBindGroupLayout;

    constructor(public readonly graphics: motion.env.GraphicsEnv) {
        const {
            shaders: { main: shader },
            buffers: { uniform },
            samplers: { main: sampler },
            bindGroupLayouts: { source: sourceBindGroupLayout },
            bindGroups: { info: infoBindGroup },
            pipelineLayouts: { main: pipelineLayout },
        } = webgpu.createAndLinkResources({
            device: graphics.device,
            shaders: {
                main: { code: shaderCode },
            },
            buffers: {
                uniform: {
                    size: Float32Array.BYTES_PER_ELEMENT * 4,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                },
            },
            samplers: {
                main: {},
            },
            bindGroupLayouts: {
                info: {
                    entries: [
                        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                    ],
                },
                source: {
                    entries: [
                        { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                    ],
                },
            },
            bindGroups: {
                info: ({ bindGroupLayouts, buffers }) => ({
                    layout: bindGroupLayouts.info,
                    entries: [
                        { binding: 0, resource: { buffer: buffers.uniform } },
                    ],
                }),
            },
            pipelineLayouts: {
                main: ({ bindGroupLayouts }) => ({
                    bindGroupLayouts: [
                        bindGroupLayouts.info,
                        bindGroupLayouts.source,
                    ],
                }),
            },
        });

        this.#shader = shader;
        this.#uniform = uniform;
        this.#sampler = sampler;
        this.#pipelineLayout = pipelineLayout;
        this.#infoBindGroup = infoBindGroup;
        this.#sourceBindGroupLayout = sourceBindGroupLayout;
    }

    render(options: GraphicsFillRenderOptions): void {
        const { encoder, target, stencil, blendState, source, opacity } = options;
        const { device, staging } = this.graphics;
        const pipeline = this.#cache.get({
            key: [
                target.format,
                stencil?.format ?? "<no-stencil>",
                stencil?.rule ?? "<no-fill-rule>",
                webgpu.blendStateKey(blendState),
            ].join("::"),
            factory: () => (device.createRenderPipeline({
                layout: this.#pipelineLayout,
                primitive: {
                    topology: "triangle-strip",
                },
                vertex: {
                    module: this.#shader,
                },
                fragment: {
                    module: this.#shader,
                    targets: [{ format: target.format, blend: blendState }],
                },
                depthStencil: stencil == null ? undefined : {
                    format: stencil.format,
                    depthWriteEnabled: false,
                    stencilReadMask: stencil.rule == "non-zero" ? 0xFF : 0x01,
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
            })),
        });

        const sourceBindGroup = device.createBindGroup({
            layout: this.#sourceBindGroupLayout,
            entries: [
                { binding: 0, resource: this.#sampler },
                { binding: 1, resource: source },
            ],
        });

        const uniformData = new Float32Array(staging.write(this.#uniform, 0, this.#uniform.size, encoder));
        uniformData[0] = opacity;

        const fillPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: target.view,
                    loadOp: "load",
                    storeOp: "store",
                },
            ],
            depthStencilAttachment: stencil == null ? undefined : {
                view: stencil.view,
                depthReadOnly: true,
                stencilReadOnly: true,
            },
        });
        fillPass.setPipeline(pipeline);
        fillPass.setBindGroup(0, this.#infoBindGroup);
        fillPass.setBindGroup(1, sourceBindGroup);
        fillPass.draw(4, 1, 0, 0);
        fillPass.end();
    }

    static cache(graphics: motion.env.GraphicsEnv): GraphicsFill {
        return graphics.cache.get({
            key: GraphicsFill,
            factory: () => new GraphicsFill(graphics),
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
