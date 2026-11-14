import * as motion from "@nahara/motion";
import type * as geometry from "@nahara/geometry";
import { NativeFunction, NativeTypeDecl } from "./internal.ts";

export type Vec2 = geometry.Vec2;
export const Vec2: motion.runtime.TypeDecl = new NativeTypeDecl(() => ({
    annotations: [
        motion.annotation.annotate("editor", {
            name: "2D Vector",
            icon: "vector",
            description: "Represent 2D position or direction",
        }),
    ],
    typeParams: [],
    family: "struct",
    fields: {
        x: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "X",
                    icon: "x",
                    description: "X position/direction",
                }),
            ],
            type: { kind: "fresh", decl: motion.runtime.coreModule.number, typeParams: [] },
            get: (_, v) => (v as geometry.Vec2)[0],
        },
        y: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Y",
                    icon: "y",
                    description: "Y position/direction",
                }),
            ],
            type: { kind: "fresh", decl: motion.runtime.coreModule.number, typeParams: [] },
            get: (_, v) => (v as geometry.Vec2)[1],
        },
    },
    default: () => [0, 0] satisfies geometry.Vec2,
    create: (_, { x, y }) => [x as number, y as number] satisfies geometry.Vec2,
    methods: {
        add: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Add vector",
                    icon: "add",
                    description: "Add vector values together",
                }),
            ],
            typeParams: [],
            inputs: [
                {
                    annotations: [
                        motion.annotation.annotate("editor", {
                            name: "Other",
                            icon: "vector",
                            description: "The other 2D vector",
                        }),
                    ],
                    type: { kind: "fresh", decl: Vec2, typeParams: [] },
                },
            ],
            returnType: { kind: "fresh", decl: Vec2, typeParams: [] },
            apply: (_, [x1, y1]: geometry.Vec2, [x2, y2]: geometry.Vec2) => [x1 + x2, y1 + y2],
        },
    },
}));

export type Transform = motion.math.Matrix4;
export const Transform: motion.runtime.TypeDecl = new NativeTypeDecl(() => ({
    annotations: [
        motion.annotation.annotate("editor", {
            name: "Transform",
            icon: "transform",
            description: "Represent a transformation on graphics",
        }),
    ],
    typeParams: [],
    family: "native",
    default: () => motion.math.Matrix4.IDENTITY,
    methods: {
        map: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Map coordinates",
                    icon: "vector",
                    description: "Transform coordinates to other space with this transformation",
                }),
            ],
            typeParams: [],
            inputs: [
                {
                    annotations: [
                        motion.annotation.annotate("editor", {
                            name: "Value",
                            icon: "vector",
                            description: "Point in space or direction",
                        }),
                    ],
                    type: { kind: "fresh", decl: Vec2, typeParams: [] },
                },
            ],
            returnType: { kind: "fresh", decl: Vec2, typeParams: [] },
            apply: (_, self: Transform, [x, y]: Vec2) => {
                const [rx, ry] = self.map(x, y, 0, 1);
                return [rx, ry];
            },
        },
        translate: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Translate",
                    icon: "translation",
                    description: "Move the graphics",
                }),
            ],
            typeParams: [],
            inputs: [
                {
                    annotations: [
                        motion.annotation.annotate("editor", {
                            name: "Translation",
                            icon: "vector",
                            description: "Offset to move the graphics",
                        }),
                    ],
                    type: { kind: "fresh", decl: Vec2, typeParams: [] },
                },
            ],
            returnType: { kind: "fresh", decl: Transform, typeParams: [] },
            apply: (_, self: Transform, [tx, ty]: Vec2) => {
                return motion.math.Matrix4.mul(self, motion.math.Matrix4.translate(tx, ty, 0));
            },
        },
        rotate: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Rotate",
                    icon: "rotation",
                    description: "Rotate the graphics",
                }),
            ],
            typeParams: [],
            inputs: [
                {
                    annotations: [
                        motion.annotation.annotate("editor", {
                            name: "Rotation",
                            icon: "rotation",
                            subtype: "angle",
                            description: "Angle to rotate the graphics",
                        }),
                    ],
                    type: { kind: "fresh", decl: motion.runtime.coreModule.number, typeParams: [] },
                },
            ],
            returnType: { kind: "fresh", decl: Transform, typeParams: [] },
            apply: (_, self: Transform, angle: number) => {
                return motion.math.Matrix4.mul(self, motion.math.Matrix4.rotate(0, 0, 1, angle));
            },
        },
        scale: {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Scale",
                    icon: "scale",
                    description: "Scale (resize) the graphics",
                }),
            ],
            typeParams: [],
            inputs: [
                {
                    annotations: [
                        motion.annotation.annotate("editor", {
                            name: "Scale",
                            icon: "scale",
                            description: "Values to scale the graphics",
                        }),
                    ],
                    type: { kind: "fresh", decl: Vec2, typeParams: [] },
                },
            ],
            returnType: { kind: "fresh", decl: Transform, typeParams: [] },
            apply: (_, self: Transform, [sx, sy]: Vec2) => {
                return motion.math.Matrix4.mul(self, motion.math.Matrix4.scale(sx, sy, 1));
            },
        },
    },
}));

export const combinedTransform: motion.runtime.Function = new NativeFunction(() => ({
    annotations: [
        motion.annotation.annotate("editor", {
            name: "Combined transform",
            icon: "transform",
            description: "Declare the initial transformation from origin, translation, rotation and scale",
        }),
    ],
    typeParams: [],
    inputs: [
        {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Origin",
                    icon: "point",
                    description: "Object's origin for scale and rotation",
                }),
            ],
            type: { kind: "fresh", decl: Vec2, typeParams: [] },
        },
        {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Offset",
                    icon: "translation",
                    description: "Object offset relative to parent's origin",
                }),
            ],
            type: { kind: "fresh", decl: Vec2, typeParams: [] },
        },
        {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Rotation",
                    icon: "rotation",
                    subtype: "angle",
                    description: "Object's rotation around its origin",
                }),
            ],
            type: { kind: "fresh", decl: motion.runtime.coreModule.number, typeParams: [] },
        },
        {
            annotations: [
                motion.annotation.annotate("editor", {
                    name: "Scale",
                    icon: "scale",
                    description: "Object's scale around its origin",
                }),
            ],
            type: { kind: "fresh", decl: Vec2, typeParams: [] },
        },
    ],
    returnType: { kind: "fresh", decl: Transform, typeParams: [] },
    apply: (_, [ox, oy]: Vec2, [tx, ty]: Vec2, angle: number, [sx, sy]: Vec2) => {
        return motion.math.Matrix4.mul(
            motion.math.Matrix4.translate(-ox, -oy, 0),
            motion.math.Matrix4.rotate(0, 0, 1, angle),
            motion.math.Matrix4.scale(sx, sy, 1),
            motion.math.Matrix4.translate(ox + tx, oy + ty, 0),
        );
    },
}));
