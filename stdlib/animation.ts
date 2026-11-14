import * as motion from "@nahara/motion";
import { NativeTypeDecl } from "./internal.ts";

const { exports } = await motion.loader.loadModule({
    source: {
        elementTable: [
            {
                kind: "struct",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Number-based keyframe",
                        icon: "keyframe",
                        description: "Keyframe that can interpolate between numbers",
                    }),
                ],
                typeParams: [],
                fields: {
                    lcp: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Left control point",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 1, typeParams: [] },
                    },
                    mcp: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Main control point",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 1, typeParams: [] },
                    },
                    rcp: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Right control point",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 1, typeParams: [] },
                    },
                },
                methods: {},
            },
            {
                kind: "struct",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Control point",
                        icon: "handle",
                        description: "Control point for number-based keyframe",
                    }),
                ],
                typeParams: [],
                fields: {
                    input: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Input",
                                description: "Input time (or value)",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 2, typeParams: [] },
                    },
                    value: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Value",
                                description: "Output value for given input",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 2, typeParams: [] },
                    },
                },
                methods: {},
            },
            { kind: "import", module: "builtin:core", name: "number" },
            {
                kind: "struct",
                annotations: [
                    motion.annotation.annotate("editor", {
                        name: "Value-based keyframe",
                        icon: "keyframe",
                        description: "Generalized keyframe that set value at given time",
                    }),
                ],
                typeParams: [
                    {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Value type",
                                description: "Type of output value",
                            }),
                        ],
                    },
                ],
                fields: {
                    input: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Input",
                                description: "Input time (or value)",
                            }),
                        ],
                        type: { kind: "fresh", declOrdinal: 2, typeParams: [] },
                    },
                    value: {
                        annotations: [
                            motion.annotation.annotate("editor", {
                                name: "Value",
                                description: "Output value for given input",
                            }),
                        ],
                        type: { kind: "parameterized", parameterOrdinal: 0 },
                    },
                },
                methods: {},
            },
        ],
        exports: {
            NumberKeyframe: 0,
            ControlPoint: 1,
            ValueKeyframe: 3,
        },
    },
    resolve: motion.loader.createResolver({
        "builtin:core": motion.runtime.coreModule,
    }),
});

export const NumberKeyframe = exports.NumberKeyframe as motion.runtime.TypeDecl;
export interface NumberKeyframe {
    readonly lcp: ControlPoint;
    readonly mcp: ControlPoint;
    readonly rcp: ControlPoint;
}

export const ControlPoint = exports.ControlPoint as motion.runtime.TypeDecl;
export interface ControlPoint {
    readonly input: number;
    readonly value: number;
}

export const ValueKeyframe = exports.ValueKeyframe as motion.runtime.TypeDecl;
export interface ValueKeyframe {
    readonly input: number;
    readonly value: unknown;
}

export interface NumberAnimation {
    readonly keyframes: readonly NumberKeyframe[];
}

export const NumberAnimation: motion.runtime.TypeDecl = new NativeTypeDecl(() => ({
    annotations: [
        motion.annotation.annotate("editor", {
            name: "Number-based keyframe animation",
            icon: "animation",
            description: "Animate with easing between keyframes",
        }),
    ],
    typeParams: [],
    family: "struct",
    default: () => ({ keyframes: [] } satisfies NumberAnimation),
    create: (_, { keyframes }) => ({ keyframes: keyframes as NumberKeyframe[] } satisfies NumberAnimation),
    fields: {
        keyframes: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Keyframes",
                    icon: "keyframe",
                    description: "A list of keyframes sorted by main control point's time",
                }),
            ],
            type: {
                kind: "fresh",
                decl: motion.runtime.coreModule.Array,
                typeParams: [
                    { kind: "fresh", decl: NumberKeyframe, typeParams: [] },
                ],
            },
            get: (_, self) => (self as NumberAnimation).keyframes,
        },
    },
    methods: {
        at: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Sample",
                    description: "Sample value from this animation",
                }),
            ],
            typeParams: [],
            inputs: [
                {
                    annotations: [
                        motion.annotation.annotate("editor", {
                            name: "Input",
                            description: "Input value to sample the animation (usually scene's time)",
                        }),
                    ],
                    type: { kind: "fresh", decl: motion.runtime.coreModule.number, typeParams: [] },
                },
            ],
            returnType: { kind: "fresh", decl: motion.runtime.coreModule.number, typeParams: [] },
            apply: (_, self: NumberAnimation, t: number) => {
                if (self.keyframes.length == 0) return 0;
                if (self.keyframes.length == 1) return self.keyframes[0].mcp.value;

                let start = 0, end = self.keyframes.length - 1;

                while (start <= end) {
                    const mid = (start + end) >> 1;
                    const reference = self.keyframes[mid].mcp.input;
                    if (reference < t) start = mid + 1;
                    else if (reference > t) end = mid - 1;
                    else return self.keyframes[mid].mcp.value;
                }

                const prev = self.keyframes[start - 1];
                const next = self.keyframes[start];
                if (prev != null && next == null) return prev.mcp.value;
                if (prev == null && next != null) return next.mcp.value;
                if (prev == null && next == null) return 0;

                const cp0 = prev.mcp;
                const cp1 = prev.rcp;
                const cp2 = next.lcp;
                const cp3 = next.mcp;

                start = 0;
                end = 1;

                while (Math.abs(end - start) > 1e-6) {
                    const mid = (start + end) / 2;
                    const reference = bezier(mid, cp0.input, cp1.input, cp2.input, cp3.input);
                    if (reference < t) start = mid;
                    else if (reference > t) end = mid;
                    else return bezier(mid, cp0.value, cp1.value, cp2.value, cp3.value);
                }

                return bezier(start, cp0.value, cp1.value, cp2.value, cp3.value);
            },
        },
    },
}));

function bezier(t: number, cp0: number, cp1: number, cp2: number, cp3: number): number {
    const i = 1 - t;
    const cp01 = cp0 * i + cp1 * t;
    const cp12 = cp1 * i + cp2 * t;
    const cp23 = cp2 * i + cp3 * t;
    const cp012 = cp01 * i + cp12 * t;
    const cp123 = cp12 * i + cp23 * t;
    return cp012 * i + cp123 * t;
}

export interface ValueAnimation {
    readonly keyframes: readonly ValueKeyframe[];
}

export const ValueAnimation: motion.runtime.TypeDecl = new NativeTypeDecl(() => ({
    annotations: [
        motion.annotation.annotate("editor", {
            name: "Keyframe animation",
            icon: "animation",
            description: "Animate by setting value at given time",
        }),
    ],
    typeParams: [
        {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Value type",
                    description: "Type of output value",
                }),
            ],
        },
    ],
    family: "struct",
    default: () => ({ keyframes: [] } satisfies ValueAnimation),
    create: (_, { keyframes }) => ({ keyframes: keyframes as ValueKeyframe[] } satisfies ValueAnimation),
    fields: {
        keyframes: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Keyframes",
                    icon: "keyframe",
                    description: "A list of keyframes sorted by time",
                }),
            ],
            type: {
                kind: "fresh",
                decl: motion.runtime.coreModule.Array,
                typeParams: [
                    {
                        kind: "fresh",
                        decl: ValueKeyframe,
                        typeParams: [
                            { kind: "parameterized", parameterOrdinal: 0 },
                        ],
                    },
                ],
            },
            get: (_, self) => (self as ValueAnimation).keyframes,
        },
    },
    methods: {
        at: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Sample",
                    description: "Sample value from this animation",
                }),
            ],
            typeParams: [],
            inputs: [
                {
                    annotations: [
                        motion.annotation.annotate("editor", {
                            name: "Input",
                            description: "Input value to sample the animation (usually scene's time)",
                        }),
                    ],
                    type: { kind: "fresh", decl: motion.runtime.coreModule.number, typeParams: [] },
                },
            ],
            returnType: { kind: "parameterized", parameterOrdinal: 0 },
            apply: ([T], self: ValueAnimation, t: number) => {
                if (self.keyframes.length == 0) return T.decl.info.default(T.typeParams);
                if (self.keyframes.length == 1) return self.keyframes[0].value;

                let start = 0, end = self.keyframes.length - 1;

                while (start <= end) {
                    const mid = (start + end) >> 1;
                    const reference = self.keyframes[mid].input;
                    if (reference < t) start = mid + 1;
                    else if (reference > t) end = mid - 1;
                    else return self.keyframes[mid].value;
                }

                const prev = self.keyframes[start - 1];
                const next = self.keyframes[start];
                if (prev != null) return prev.value;
                if (next != null) return next.value;
                return T.decl.info.default(T.typeParams);
            },
        },
    },
}));
