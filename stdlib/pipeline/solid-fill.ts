import type * as motion from "@nahara/motion";
import * as webgpu from "@nahara/webgpu";
import shaderCode from "./solid-fill.wgsl" with { type: "text" };

export interface SolidFillRenderOptions {
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
    readonly color: readonly [r: number, g: number, b: number, a: number];
}

export class SolidFill implements Disposable {
    #cache = new webgpu.Cache();
    #shader: GPUShaderModule;
    #uniform: GPUBuffer;
    #pipelineLayout: GPUPipelineLayout;
    #bindGroup: GPUBindGroup;

    constructor(public readonly graphics: motion.env.GraphicsEnv) {
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
                    size: Float32Array.BYTES_PER_ELEMENT * 4,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                },
            },
            bindGroupLayouts: {
                main: {
                    entries: [
                        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
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

    render(options: SolidFillRenderOptions): void {
        const { encoder, target, stencil, blendState, color } = options;
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

        const uniformData = new Float32Array(staging.write(this.#uniform, 0, this.#uniform.size, encoder));
        uniformData[0] = color[0];
        uniformData[1] = color[1];
        uniformData[2] = color[2];
        uniformData[3] = color[3];

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
        fillPass.setBindGroup(0, this.#bindGroup);
        fillPass.draw(4, 1, 0, 0);
        fillPass.end();
    }

    static cache(graphics: motion.env.GraphicsEnv): SolidFill {
        return graphics.cache.get({
            key: SolidFill,
            factory: () => new SolidFill(graphics),
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
