import * as motion from "@nahara/motion";
import * as helper from "@nahara/motion-helper";
import * as pipeline from "./pipeline/mod.ts";
import { createVariant, type Variant } from "./internal.ts";
import { Path } from "./path.ts";

const { HostComponent, HostStructType, Type } = helper.host;

export type Color = readonly [r: number, g: number, b: number];
export const Color: motion.runtime.Struct = new HostStructType<Color>({
    default: () => [0, 0, 0],
    create: (_, { r = 0, g = 0, b = 0 }) => [r, g, b],
    fields: {
        r: { type: Type.concrete(motion.core.number), name: "Red", get: (c) => c[0] },
        g: { type: Type.concrete(motion.core.number), name: "Green", get: (c) => c[1] },
        b: { type: Type.concrete(motion.core.number), name: "Blue", get: (c) => c[2] },
    },
});

export type FillStyle = Variant<FillStyles>;
export interface FillStyles {
    readonly None: null;
    readonly Solid: Color;
    readonly Graphics: null;
}

export const FillStyle: motion.runtime.Variant = createVariant<FillStyles>({
    name: "Fill style",
    debugName: "FillStyle",
    description: "How the graphics should be filled",
    default: () => ({ option: "None", data: null }),
    options: {
        None: {
            name: "No fill",
            description: "Do not fill",
            dataType: null,
        },
        Solid: {
            name: "Solid color",
            description: "Fill with a solid color",
            dataType: Type.concrete(Color),
        },
        Graphics: {
            name: "Graphics content",
            description: [
                "Fill with children graphics content",
                "This will create a new render layer.",
            ],
            dataType: null,
        },
    },
});

export type FillRule = Variant<FillRules>;
export interface FillRules {
    readonly NonZero: null;
    readonly EvenOdd: null;
}

export const FillRule: motion.runtime.Variant = createVariant<FillRules>({
    name: "Fill rule",
    debugName: "FillRule",
    description: "Fill winding rule for vector graphcis",
    default: () => ({ option: "NonZero", data: null }),
    options: {
        NonZero: {
            name: "Non-zero",
            description: "Only fill when the winding number is not zero",
            dataType: null,
        },
        EvenOdd: {
            name: "Even-odd",
            description: "Only fill when the winding number is odd",
            dataType: null,
        },
    },
});

export const Vector: motion.runtime.Component = new HostComponent({
    name: "Vector",
    debugName: "Vector",
    description: [
        "Draw vector graphics",
    ],
    parameters: {
        paths: {
            name: "Paths",
            description: "List of paths to draw the vector graphics",
            output: Type.concrete(motion.core.array, [Type.concrete(Path)]),
        },
        fillStyle: {
            name: "Fill style",
            output: Type.concrete(FillStyle),
        },
        fillRule: {
            name: "Fill rule",
            output: Type.concrete(FillRule),
        },
        opacity: {
            name: "Opacity",
            output: Type.concrete(motion.core.number),
        },
    },
    slots: {
        fillGraphics: {
            name: "Fill graphics",
            description: [
                "Content to be used as fill when fill style is set to graphics content",
                "Setting fill style to graphics content will create a new layer context so that the content in this slot can be drawn into.",
            ],
        },
    },
    render: async ({
        context,
        parameters: {
            paths: pathsParam = () => [],
            fillStyle: fillStyleParam = () => ({ option: "None", data: null } satisfies FillStyle),
            fillRule: fillRuleParam = () => ({ option: "NonZero", data: null } satisfies FillRule),
            opacity: opacityParam = () => 1.00,
        },
        slots: {
            fillGraphics = () => {},
        },
    }) => {
        const contexts = context.getMultiple(
            motion.context.GraphicsContext,
        );

        if (contexts == null) return;
        const [graphics] = contexts;

        const paths: Path[] = pathsParam();
        const fillStyle: FillStyle = fillStyleParam();
        const fillRule: FillRule = fillRuleParam();
        const opacity: number = opacityParam();
        const blendState: GPUBlendState = {
            color: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" },
        };

        const { width, height } = graphics.target;
        using stencil = graphics.env.texturePool.borrow({
            width,
            height,
            format: "stencil8",
            sampleCount: 1,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        pipeline.PathStencil.cache(graphics.env).render({
            encoder: graphics.encoder,
            paths,
            stencil: {
                format: "stencil8",
                view: stencil.resource.createView(),
            },
            transform: {
                proj: motion.math.Matrix4.projection2D(
                    graphics.target.width,
                    graphics.target.height,
                ),
                view: motion.math.Matrix4.IDENTITY,
                model: motion.math.Matrix4.IDENTITY,
            },
        });

        switch (fillStyle.option) {
            case "Solid": {
                pipeline.SolidFill.cache(graphics.env).render({
                    encoder: graphics.encoder,
                    target: {
                        format: graphics.target.format,
                        view: graphics.target.createView(),
                    },
                    stencil: {
                        format: "stencil8",
                        view: stencil.resource.createView(),
                        rule: fillRule.option == "EvenOdd" ? "even-odd" : "non-zero",
                    },
                    blendState,
                    color: [
                        fillStyle.data[0] * opacity,
                        fillStyle.data[1] * opacity,
                        fillStyle.data[2] * opacity,
                        opacity,
                    ],
                });
                break;
            }

            case "Graphics": {
                using childrenTarget = graphics.env.texturePool.borrow({
                    width,
                    height,
                    format: graphics.target.format,
                    sampleCount: 1,
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                });
                const clearPass = graphics.encoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view: childrenTarget.resource.createView(),
                            loadOp: "clear",
                            storeOp: "store",
                            clearValue: [0, 0, 0, 0],
                        },
                    ],
                });
                clearPass.end();
                await fillGraphics(context.with(graphics.withTarget(childrenTarget.resource)));
                pipeline.GraphicsFill.cache(graphics.env).render({
                    encoder: graphics.encoder,
                    target: {
                        format: graphics.target.format,
                        view: graphics.target.createView(),
                    },
                    stencil: {
                        format: "stencil8",
                        view: stencil.resource.createView(),
                        rule: fillRule.option == "EvenOdd" ? "even-odd" : "non-zero",
                    },
                    blendState,
                    source: childrenTarget.resource.createView(),
                    opacity,
                });
                break;
            }
        }
    },
});
