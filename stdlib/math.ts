import * as motion from "@nahara/motion";
import * as helper from "@nahara/motion-helper";
import type * as geometry from "@nahara/geometry";

const { HostFunction, HostStructType, Type } = helper.host;

const decimalBinaryInputs: readonly helper.host.InputOptions[] = [
    {
        type: Type.concrete(motion.core.number),
        name: "A",
        debugName: "a",
        description: "First value",
    },
    {
        type: Type.concrete(motion.core.number),
        name: "B",
        debugName: "b",
        description: "Second value",
    },
];

export const add: motion.runtime.Function = new HostFunction({
    name: "Add",
    debugName: "add",
    description: [
        "Add 2 decimal values together",
        "Equation: A + B",
    ],
    inputs: decimalBinaryInputs,
    output: Type.concrete(motion.core.number),
    fn: (_, a: number, b: number) => a + b,
});

export const sub: motion.runtime.Function = new HostFunction({
    name: "Subtract",
    debugName: "sub",
    description: [
        "Subtract first value by second value",
        "Equation: A - B",
    ],
    inputs: decimalBinaryInputs,
    output: Type.concrete(motion.core.number),
    fn: (_, a: number, b: number) => a - b,
});

export const mul: motion.runtime.Function = new HostFunction({
    name: "Multiply",
    debugName: "mul",
    description: [
        "Multiply 2 decimal values together",
        "Equation: A * B",
    ],
    inputs: decimalBinaryInputs,
    output: Type.concrete(motion.core.number),
    fn: (_, a: number, b: number) => a * b,
});

export const div: motion.runtime.Function = new HostFunction({
    name: "Divide",
    debugName: "div",
    description: [
        "Divide first value by second value",
        "Equation: A / B",
    ],
    inputs: decimalBinaryInputs,
    output: Type.concrete(motion.core.number),
    fn: (_, a: number, b: number) => a / b,
});

export type Vec2 = geometry.Vec2;
export const Vec2: motion.runtime.Struct = new HostStructType<Vec2>({
    name: "2D vector",
    debugName: "Vec2",
    description: [
        "A pair of 2 decimal values",
        "A vector can represent a position or direction in space.",
    ],
    default: () => [0, 0],
    create: (_, { x = 0, y = 0 }) => [x, y],
    fields: {
        x: { name: "X", type: Type.concrete(motion.core.number), get: (v) => v[0] },
        y: { name: "Y", type: Type.concrete(motion.core.number), get: (v) => v[1] },
    },
});

export type Transformation = motion.math.Matrix4;
export const Transformation: motion.runtime.Struct = new HostStructType<Transformation>({
    name: "Transformation",
    debugName: "Transformation",
    description: [
        "Represent a transformation",
        "A transformation can be used to translate (move), rotate or scale graphics, points or directions.",
        "Transformation can be created from 4x4 matrix components that representing the transformation.",
    ],
    default: () => motion.math.Matrix4.IDENTITY,
    create: (_, {
        m11 = 1,
        m12 = 0,
        m13 = 0,
        m14 = 0,
        m21 = 0,
        m22 = 1,
        m23 = 0,
        m24 = 0,
        m31 = 0,
        m32 = 0,
        m33 = 1,
        m34 = 0,
        m41 = 0,
        m42 = 0,
        m43 = 0,
        m44 = 1,
    }) =>
        motion.math.Matrix4.fromArray([
            [m11, m12, m13, m14],
            [m21, m22, m23, m24],
            [m31, m32, m33, m34],
            [m41, m42, m43, m44],
        ].flat()),
    fields: {
        m11: { name: "Row 1 : Col 1", type: Type.concrete(motion.core.number), get: (self) => self.get(0) },
        m12: { name: "Row 2 : Col 1", type: Type.concrete(motion.core.number), get: (self) => self.get(1) },
        m13: { name: "Row 3 : Col 1", type: Type.concrete(motion.core.number), get: (self) => self.get(2) },
        m14: { name: "Row 4 : Col 1", type: Type.concrete(motion.core.number), get: (self) => self.get(3) },
        m21: { name: "Row 1 : Col 2", type: Type.concrete(motion.core.number), get: (self) => self.get(4) },
        m22: { name: "Row 2 : Col 2", type: Type.concrete(motion.core.number), get: (self) => self.get(5) },
        m23: { name: "Row 3 : Col 2", type: Type.concrete(motion.core.number), get: (self) => self.get(6) },
        m24: { name: "Row 4 : Col 2", type: Type.concrete(motion.core.number), get: (self) => self.get(7) },
        m31: { name: "Row 1 : Col 3", type: Type.concrete(motion.core.number), get: (self) => self.get(8) },
        m32: { name: "Row 2 : Col 3", type: Type.concrete(motion.core.number), get: (self) => self.get(9) },
        m33: { name: "Row 3 : Col 3", type: Type.concrete(motion.core.number), get: (self) => self.get(10) },
        m34: { name: "Row 4 : Col 3", type: Type.concrete(motion.core.number), get: (self) => self.get(11) },
        m41: { name: "Row 1 : Col 4", type: Type.concrete(motion.core.number), get: (self) => self.get(12) },
        m42: { name: "Row 2 : Col 4", type: Type.concrete(motion.core.number), get: (self) => self.get(13) },
        m43: { name: "Row 3 : Col 4", type: Type.concrete(motion.core.number), get: (self) => self.get(14) },
        m44: { name: "Row 4 : Col 4", type: Type.concrete(motion.core.number), get: (self) => self.get(15) },
    },
});
