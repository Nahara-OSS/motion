import * as motion from "@nahara/motion";
import * as geometry from "@nahara/geometry";
import * as math from "./math.ts";
import * as pipeline from "./pipeline/mod.ts";
import { NativeComponent, type Variant } from "./internal.ts";

const { exports } = await motion.loader.loadModule({
    source: {
        elementTable: [
            { kind: "import", module: "builtin:core", name: "number" },
            { kind: "import", module: "builtin:core", name: "Array" },
            {
                kind: "struct",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Color",
                        icon: "color",
                        description: "A combination of red, green and blue color channels",
                    }),
                ],
                typeParams: [],
                fields: {
                    red: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Red",
                                icon: "red",
                                description: "Red color channel",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 0, typeParams: [] },
                    },
                    green: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Green",
                                icon: "green",
                                description: "Green color channel",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 0, typeParams: [] },
                    },
                    blue: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Blue",
                                icon: "blue",
                                description: "Blue color channel",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 0, typeParams: [] },
                    },
                },
                methods: {},
            },
            {
                kind: "variant",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Fill style",
                        icon: "fill",
                        description: "How the content should be filled",
                    }),
                ],
                typeParams: [],
                default: "None",
                options: {
                    None: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "None",
                                icon: "none",
                                description: "No fill",
                            }),
                        ],
                        type: null,
                    },
                    Solid: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Solid color",
                                icon: "color",
                                description: "Fill using solid color",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 2, typeParams: [] },
                    },
                    Graphics: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Graphics",
                                icon: "image",
                                description: "Fill using children graphics",
                            }),
                        ],
                        type: null,
                    },
                },
                methods: {},
            },
            {
                kind: "struct",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Stroke style",
                        icon: "stroke",
                        description: "How the stroke (outline) should be drawn",
                    }),
                ],
                typeParams: [],
                fields: {
                    thickness: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Thickness",
                                icon: "thickness",
                                description: "The thickness of the stroke",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 0, typeParams: [] },
                    },
                    fill: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Fill style",
                                icon: "fill",
                                description: "Fill style for the stroke",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 3, typeParams: [] },
                    },
                    dash: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Dashing pattern",
                                icon: "dash",
                                description: "Dashing pattern arranged in fill-spacing order",
                                examples: [
                                    "Continuous stroke: [] (empty list)",
                                    "Dotted stroke: [1] (fill 1 unit, space 1 unit)",
                                    "Dotted stroke: [1, 1] (fill 1 unit, space 1 unit)",
                                    "Dashed stroke: [5] (fill 5 units, space 5 units)",
                                    "Dashed stroke: [5, 3] (fill 5 units, space 3 units)",
                                    "Complex pattern (odd): [1, 2, 3] (fill 1 - space 2 - fill 3 - space 1 - etc)",
                                    "Complex pattern (even): [1, 2, 3, 4] (fill 1 - space 2 - fill 3 - space 4 - etc)",
                                ],
                            }),
                        ],
                        type: {
                            kind: "fresh",
                            declOrdinal: 1,
                            typeParams: [
                                { kind: "fresh", declOrdinal: 0, typeParams: [] },
                            ],
                        },
                    },
                },
                methods: {},
            },
            {
                kind: "variant",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Fill rule",
                        icon: "fill-rule",
                        description: "Vector graphics fill winding rule",
                    }),
                ],
                typeParams: [],
                default: "NonZero",
                options: {
                    NonZero: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Non-zero",
                                icon: "fill-rule",
                                description: "Fill area that have non-zero winding",
                            }),
                        ],
                        type: null,
                    },
                    EvenOdd: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Even-odd",
                                icon: "fill-rule",
                                description: "Fill area that have odd number of winding",
                            }),
                        ],
                        type: null,
                    },
                },
                methods: {},
            },
            { kind: "import", module: "builtin:math", name: "Vec2" },
            {
                kind: "variant",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Path command",
                        icon: "vector",
                        description: "Commands to move the drawing pen",
                    }),
                ],
                typeParams: [],
                default: "Move",
                options: {
                    Move: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Move to position",
                                icon: "move",
                                description: "Move drawing pen to coordinates",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 6, typeParams: [] },
                    },
                    Line: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Line to position",
                                icon: "line",
                                description: "Move and drag drawing pen to coordinates in a straight line",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 6, typeParams: [] },
                    },
                    Quadratic: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Quadratic bezier to position",
                                icon: "curve",
                                description: "Move and drag drawing pen along quadratic bezier path",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 8, typeParams: [] },
                    },
                    Cubic: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Cubic bezier to position",
                                icon: "curve",
                                description: "Move and drag drawing pen along cubic bezier path",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 9, typeParams: [] },
                    },
                    Close: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Close path",
                                icon: "line",
                                description: "Move and drag drawing pen to start position",
                            }),
                        ],
                        type: null,
                    },
                },
                methods: {},
            },
            {
                kind: "struct",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Quadratic bezier command",
                        icon: "curve",
                        description: "Data for quadratic bezier path command",
                    }),
                ],
                typeParams: [],
                fields: {
                    cp: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Control point",
                                icon: "handle",
                                description: "Position of control point",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 6, typeParams: [] },
                    },
                    target: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Target position",
                                icon: "handle",
                                description: "Target pen position",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 6, typeParams: [] },
                    },
                },
                methods: {},
            },
            {
                kind: "struct",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Cubic bezier command",
                        icon: "curve",
                        description: "Data for cubic bezier path command",
                    }),
                ],
                typeParams: [],
                fields: {
                    cp1: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Control point 1",
                                icon: "handle",
                                description: "Position of first control point",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 6, typeParams: [] },
                    },
                    cp2: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Control point 2",
                                icon: "handle",
                                description: "Position of first control point",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 6, typeParams: [] },
                    },
                    target: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Target position",
                                icon: "handle",
                                description: "Target pen position",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 6, typeParams: [] },
                    },
                },
                methods: {},
            },
            {
                kind: "variant",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Blend mode",
                        icon: "blend",
                        description: "How the incoming image blends on top of view",
                    }),
                ],
                typeParams: [],
                default: "Normal",
                options: {
                    Normal: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Normal",
                                icon: "blend",
                                description: "Layer image on top of view",
                            }),
                        ],
                        type: null,
                    },
                    Additive: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Additive",
                                icon: "add",
                                description: "Add color values",
                            }),
                        ],
                        type: null,
                    },
                    Erase: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Erase",
                                icon: "eraser",
                                description: "Use top image as erase mask",
                            }),
                        ],
                        type: null,
                    },
                    Custom: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Custom",
                                icon: "blend",
                                description: "Use custom blending mode",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 11, typeParams: [] },
                    },
                },
                methods: {},
            },
            {
                kind: "struct",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Custom blend settings",
                        icon: "blend",
                        description: "Settings for custom blending mode",
                    }),
                ],
                typeParams: [],
                fields: {
                    color: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Color",
                                icon: "color",
                                description: "Color channel settings",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 12, typeParams: [] },
                    },
                    alpha: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Alpha",
                                icon: "alpha",
                                description: "Alpha channel settings",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 12, typeParams: [] },
                    },
                },
                methods: {},
            },
            {
                kind: "struct",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Channel blend settings",
                        icon: "blend",
                        description: "Custom blending settings for channel",
                    }),
                ],
                typeParams: [],
                fields: {
                    op: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Operation",
                                description: "Blending operation between 2 values",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 13, typeParams: [] },
                    },
                    src: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Source",
                                description: "Value multiplier for source",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 14, typeParams: [] },
                    },
                    dst: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Destination",
                                description: "Value multiplier for destination",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 14, typeParams: [] },
                    },
                },
                methods: {},
            },
            {
                kind: "variant",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Blend operation",
                        description: "Operation to apply on source and destination",
                    }),
                ],
                typeParams: [],
                default: "Add",
                options: {
                    Add: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Source + Destination",
                                icon: "add",
                            }),
                        ],
                        type: null,
                    },
                    Sub: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Source - Destination",
                                icon: "subtract",
                            }),
                        ],
                        type: null,
                    },
                    ReverseSub: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Destination - Source",
                                icon: "subtract",
                            }),
                        ],
                        type: null,
                    },
                    Min: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Min(Source, Destination)",
                            }),
                        ],
                        type: null,
                    },
                    Max: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Max(Source, Destination)",
                            }),
                        ],
                        type: null,
                    },
                },
                methods: {},
            },
            {
                kind: "variant",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Blend multiplier source",
                        description: "Source of multiplier value for custom blend mode",
                    }),
                ],
                typeParams: [],
                default: "Zero",
                options: {
                    Zero: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Zero",
                                description: "Multiply value by 0 (ignore channels)",
                            }),
                        ],
                        type: null,
                    },
                    One: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "One",
                                description: "Multiply value by 1 (accept channels as-is)",
                            }),
                        ],
                        type: null,
                    },
                    Src: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Source color",
                                description: "Use source color as multiplier",
                            }),
                        ],
                        type: null,
                    },
                    Dst: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Destination color",
                                description: "Use destination color as multiplier",
                            }),
                        ],
                        type: null,
                    },
                    SrcAlpha: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Source alpha",
                                description: "Use source alpha as multiplier",
                            }),
                        ],
                        type: null,
                    },
                    DstAlpha: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Destination alpha",
                                description: "Use destination alpha as multiplier",
                            }),
                        ],
                        type: null,
                    },
                    OneMinusSrc: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "1 - Source",
                            }),
                        ],
                        type: null,
                    },
                    OneMinusDst: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "1 - Destination",
                            }),
                        ],
                        type: null,
                    },
                    OneMinusSrcAlpha: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "1 - Source alpha",
                            }),
                        ],
                        type: null,
                    },
                    OneMinusDstAlpha: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "1 - Destination alpha",
                            }),
                        ],
                        type: null,
                    },
                },
                methods: {},
            },
        ],
        exports: {
            Color: 2,
            Fill: 3,
            Stroke: 4,
            FillRule: 5,
            PathCommand: 7,
            PathQuadraticCommand: 8,
            PathCubicCommand: 9,
            Blend: 10,
            BlendCustom: 11,
            BlendComponent: 12,
            BlendOperation: 13,
            BlendFactor: 14,
        },
    },
    resolve: motion.loader.createResolver({
        "builtin:core": motion.runtime.coreModule,
        "builtin:math": math,
    }),
});

export const Color = exports.Color as motion.runtime.TypeDecl;
export interface Color {
    readonly red: number;
    readonly green: number;
    readonly blue: number;
}

export const Fill = exports.Fill as motion.runtime.TypeDecl;
export type Fill = Variant<{
    None: null;
    Solid: Color;
    Graphics: null;
}>;

export const Stroke = exports.Stroke as motion.runtime.TypeDecl;
export interface Storke {
    readonly thickness: number;
    readonly fill: Fill;
    readonly dash: readonly number[];
}

export const FillRule = exports.FillRule as motion.runtime.TypeDecl;
export type FillRule = Variant<{
    NonZero: null;
    EvenOdd: null;
}>;

export const PathCommand = exports.PathCommand as motion.runtime.TypeDecl;
export type PathCommand = Variant<{
    Move: math.Vec2;
    Line: math.Vec2;
    Quadratic: PathQuadraticCommand;
    Cubic: PathCubicCommand;
    Close: null;
}>;

export const PathQuadraticCommand = exports.PathQuadraticCommand as motion.runtime.TypeDecl;
export interface PathQuadraticCommand {
    readonly cp: math.Vec2;
    readonly target: math.Vec2;
}

export const PathCubicCommand = exports.PathCubicCommand as motion.runtime.TypeDecl;
export interface PathCubicCommand {
    readonly cp1: math.Vec2;
    readonly cp2: math.Vec2;
    readonly target: math.Vec2;
}

export const Blend = exports.Blend as motion.runtime.TypeDecl;
export type Blend = Variant<{
    Normal: null;
    Additive: null;
    Erase: null;
    Custom: BlendCustom;
}>;

export const BlendCustom = exports.BlendCustom as motion.runtime.TypeDecl;
export interface BlendCustom {
    readonly color: BlendComponent;
    readonly alpha: BlendComponent;
}

export const BlendComponent = exports.BlendComponent as motion.runtime.TypeDecl;
export interface BlendComponent {
    readonly op: BlendOperation;
    readonly src: BlendFactor;
    readonly dst: BlendFactor;
}

export const BlendOperation = exports.BlendOperation as motion.runtime.TypeDecl;
export type BlendOperation = Variant<{
    Add: null;
    Sub: null;
    ReverseSub: null;
    Min: null;
    Max: null;
}>;

export const BlendFactor = exports.BlendFactor as motion.runtime.TypeDecl;
export type BlendFactor = Variant<{
    Zero: null;
    One: null;
    Src: null;
    OneMinusSrc: null;
    SrcAlpha: null;
    OneMinusSrcAlpha: null;
    Dst: null;
    OneMinusDst: null;
    DstAlpha: null;
    OneMinusDstAlpha: null;
}>;

function blendToGPU(blend: Blend): GPUBlendState {
    switch (blend.option) {
        case "Normal": {
            return {
                color: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" },
                alpha: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            };
        }

        case "Additive": {
            return {
                color: { operation: "add", srcFactor: "one", dstFactor: "one" },
                alpha: { operation: "add", srcFactor: "one", dstFactor: "one" },
            };
        }

        case "Erase": {
            return {
                color: { operation: "add", srcFactor: "zero", dstFactor: "one-minus-src-alpha" },
                alpha: { operation: "add", srcFactor: "zero", dstFactor: "one-minus-src-alpha" },
            };
        }

        case "Custom": {
            return {
                color: blendComponentToGPU(blend.data.color),
                alpha: blendComponentToGPU(blend.data.alpha),
            };
        }
    }
}

function blendComponentToGPU(blend: BlendComponent): GPUBlendComponent {
    return {
        operation: blendOperationToGPU[blend.op.option],
        srcFactor: blendFactorToGPU[blend.src.option],
        dstFactor: blendFactorToGPU[blend.dst.option],
    };
}

const blendOperationToGPU: Readonly<Record<BlendOperation["option"], GPUBlendOperation>> = {
    Add: "add",
    Sub: "subtract",
    ReverseSub: "reverse-subtract",
    Min: "min",
    Max: "max",
};

const blendFactorToGPU: Readonly<Record<BlendFactor["option"], GPUBlendFactor>> = {
    Zero: "zero",
    One: "one",
    Src: "src",
    SrcAlpha: "src-alpha",
    OneMinusSrc: "one-minus-src",
    OneMinusSrcAlpha: "one-minus-src-alpha",
    Dst: "dst",
    DstAlpha: "dst-alpha",
    OneMinusDst: "one-minus-dst",
    OneMinusDstAlpha: "one-minus-dst-alpha",
};

export const Vector: motion.runtime.Component = new NativeComponent(() => ({
    annotations: [
        motion.annotation.annotate("editor", {
            name: "Vector",
            icon: "vector-object",
            description: "Draw vector graphics",
        }),
    ],
    typeParams: [],
    parameters: {
        transform: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Transform",
                    icon: "transform",
                    description: "Object's graphics transformation",
                }),
            ],
            inputs: [],
            returnType: { kind: "fresh", decl: math.Transform, typeParams: [] },
        },
        path: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Path",
                    icon: "vector-object",
                    description: "List of commands to draw the path",
                }),
            ],
            inputs: [],
            returnType: {
                kind: "fresh",
                decl: motion.runtime.coreModule.Array,
                typeParams: [
                    { kind: "fresh", decl: PathCommand, typeParams: [] },
                ],
            },
        },
        fillRule: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Fill rule",
                    icon: "fill-rule",
                    description: "Fill rule based on number of winding",
                }),
            ],
            inputs: [],
            returnType: { kind: "fresh", decl: FillRule, typeParams: [] },
        },
        fill: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Fill",
                    icon: "fill",
                    description: "Fill style of vector graphics",
                }),
            ],
            inputs: [],
            returnType: { kind: "fresh", decl: Fill, typeParams: [] },
        },
        blend: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Blend mode",
                    icon: "blend",
                    description: "Blending mode",
                }),
            ],
            inputs: [],
            returnType: { kind: "fresh", decl: Blend, typeParams: [] },
        },
        alpha: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Opacity",
                    icon: "opacity",
                    description: "Opacity of the whole vector graphics",
                }),
            ],
            inputs: [],
            returnType: { kind: "fresh", decl: motion.runtime.coreModule.number, typeParams: [] },
        },
    },
    slots: {
        fillGraphics: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Fill graphics",
                    icon: "image",
                    description: "Graphics to fill the shape (only when fill mode is set to graphics)",
                }),
            ],
            inputs: [],
        },
    },
    eval: async ({
        context,
        parameters: {
            transform: transformParam = () => motion.math.Matrix4.IDENTITY,
            path: pathParam = () => [],
            fillRule: fillRuleParam = () => ({ option: "NonZero", data: null } satisfies FillRule),
            fill: fillParam = () => ({ option: "None", data: null } satisfies Fill),
            blend: blendParam = () => ({ option: "Normal", data: null } satisfies Blend),
            alpha: alphaParam = () => 1,
        } = {},
        slots: {
            fillGraphics: fillGraphicsSlot = () => {},
        } = {},
    }) => {
        const transform = transformParam() as motion.math.Matrix4;
        const path = pathParam() as PathCommand[];
        const fillRule = fillRuleParam() as FillRule;
        const fill = fillParam() as Fill;
        const alpha = alphaParam() as number;
        const blend = blendParam() as Blend;

        const graphics = context.get(motion.context.GraphicsContext);
        const targetLayer = context.get(motion.context.LayerContext);
        const camera = context.get(motion.context.CameraContext);
        const model = context.get(motion.context.ModelContext);
        const cache = context.get(motion.context.CacheContext);

        if (
            graphics == null ||
            targetLayer == null ||
            camera == null ||
            model == null ||
            cache == null
        ) {
            return;
        }

        const pipelines = pipeline.cacheAll(cache, graphics.env);
        const colorTextureView = targetLayer.colorTexture.createView();
        const depthStencilView = targetLayer.depthStencil.createView();
        const blendState = blendToGPU(blend);
        const modelMat = motion.math.Matrix4.mul(model.model, transform);

        pipelines.stencil.path({
            encoder: graphics.encoder,
            path: geometry.path.penCommandsToPath(stdlibPathToPenCommands(path)),
            projMat: camera.projection,
            viewMat: camera.view,
            modelMat,
            stencilFormat: targetLayer.depthStencil.format,
            stencilView: depthStencilView,
        });

        switch (fill.option) {
            case "Solid": {
                pipelines.fill.solid({
                    encoder: graphics.encoder,
                    colorTexture: {
                        format: targetLayer.colorTexture.format,
                        view: colorTextureView,
                    },
                    stencilTexture: {
                        format: targetLayer.depthStencil.format,
                        view: depthStencilView,
                        winding: fillRule.option == "NonZero" ? "non-zero" : "even-odd",
                    },
                    blendState,
                    color: [
                        fill.data.red * alpha,
                        fill.data.green * alpha,
                        fill.data.blue * alpha,
                        alpha,
                    ],
                });
                break;
            }

            case "Graphics": {
                using colorTexture = graphics.env.texturePool.borrow({
                    width: targetLayer.colorTexture.width,
                    height: targetLayer.colorTexture.height,
                    format: targetLayer.colorTexture.format,
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                });
                using depthStencil = graphics.env.texturePool.borrow({
                    width: targetLayer.depthStencil.width,
                    height: targetLayer.depthStencil.height,
                    format: targetLayer.depthStencil.format,
                    usage: GPUTextureUsage.RENDER_ATTACHMENT,
                });
                const clearPass = graphics.encoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view: colorTexture.resource.createView(),
                            loadOp: "clear",
                            storeOp: "store",
                            clearValue: [0, 0, 0, 0],
                        },
                    ],
                    depthStencilAttachment: {
                        view: depthStencil.resource.createView(),
                        depthReadOnly: false,
                        depthLoadOp: "clear",
                        depthStoreOp: "store",
                        depthClearValue: 0,
                        stencilReadOnly: false,
                        stencilLoadOp: "clear",
                        stencilStoreOp: "store",
                        stencilClearValue: 0,
                    },
                });
                clearPass.end();
                await fillGraphicsSlot(
                    context
                        .with(
                            motion.context.LayerContext,
                            new motion.context.LayerContext(colorTexture.resource, depthStencil.resource),
                        )
                        .with(
                            motion.context.ModelContext,
                            new motion.context.ModelContext(modelMat),
                        ),
                );
                pipelines.fill.graphics({
                    encoder: graphics.encoder,
                    colorFormat: targetLayer.colorTexture.format,
                    stencilFormat: targetLayer.depthStencil.format,
                    colorView: colorTextureView,
                    stencilView: depthStencilView,
                    winding: fillRule.option == "NonZero" ? "non-zero" : "even-odd",
                    blendState,
                    sourceView: colorTexture.resource.createView(),
                    alpha: alpha,
                });
                break;
            }
        }
    },
}));

function* stdlibPathToPenCommands(commands: Iterable<PathCommand>): Generator<geometry.path.PenCommand, void, void> {
    for (const command of commands) {
        switch (command.option) {
            case "Move": {
                yield { type: "move", target: command.data };
                break;
            }

            case "Line": {
                yield { type: "line", target: command.data };
                break;
            }

            case "Quadratic": {
                const { cp, target } = command.data;
                yield { type: "quadratic", cp, target };
                break;
            }

            case "Cubic": {
                const { cp1, cp2, target } = command.data;
                yield { type: "cubic", cp1, cp2, target };
                break;
            }

            case "Close": {
                yield { type: "close" };
                break;
            }
        }
    }
}
