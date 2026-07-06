import * as motion from "@nahara/motion";
import { BooleanType } from "../../value.ts";

const { NumberType } = motion.value;

function swizzle<T, R extends readonly number[]>(
    set: string,
    returnType: motion.value.ValueType<R>,
    size: R["length"],
    property: motion.value.ValueTypeBuilder<T>["property"],
    getter: (self: T, index: number) => number,
): void {
    function applyRecursive(prefix: string) {
        if (prefix.length < size) {
            for (let i = 0; i < set.length; i++) applyRecursive(prefix + set[i]);
            return;
        }

        const indices = new Array(size);
        for (let i = 0; i < prefix.length; i++) indices[i] = set.indexOf(prefix[i]);

        property(prefix, returnType, (self) => {
            const value = indices.map((i) => getter(self, i));
            return value as unknown as R;
        }).hideInDocs();
    }

    applyRecursive("");
}

export type Vec2 = readonly [x: number, y: number];
export type Vec3 = readonly [x: number, y: number, z: number];

export const Vec2Type: motion.value.ValueType<Vec2> = new motion.value.ValueType("vec2", ({
    binaryOp,
    unaryOp,
    property,
}) => {
    binaryOp("+", Vec2Type, Vec2Type, ([x1, y1], [x2, y2]) => [x1 + x2, y1 + y2] as const);
    binaryOp("-", Vec2Type, Vec2Type, ([x1, y1], [x2, y2]) => [x1 - x2, y1 - y2] as const);
    binaryOp("*", Vec2Type, Vec2Type, ([x1, y1], [x2, y2]) => [x1 * x2, y1 * y2] as const);
    binaryOp("/", Vec2Type, Vec2Type, ([x1, y1], [x2, y2]) => [x1 / x2, y1 / y2] as const);
    binaryOp("+", NumberType, Vec2Type, ([x, y], s) => [x + s, y + s] as const);
    binaryOp("-", NumberType, Vec2Type, ([x, y], s) => [x - s, y - s] as const);
    binaryOp("*", NumberType, Vec2Type, ([x, y], s) => [x * s, y * s] as const);
    binaryOp("/", NumberType, Vec2Type, ([x, y], s) => [x / s, y / s] as const);
    binaryOp("==", Vec2Type, BooleanType, ([x1, y1], [x2, y2]) => x1 == x2 && y1 == y2);
    binaryOp("!=", Vec2Type, BooleanType, ([x1, y1], [x2, y2]) => x1 != x2 && y1 != y2);

    unaryOp("+", Vec2Type, ([x, y]) => [+x, +y] as const);
    unaryOp("-", Vec2Type, ([x, y]) => [-x, -y] as const);

    property("x", NumberType, (v) => v[0]);
    property("y", NumberType, (v) => v[1]);

    swizzle("xy", Vec2Type, 2, property, (self, index) => self[index]);
    swizzle("xy", Vec3Type, 3, property, (self, index) => self[index]);
});

export const Vec3Type: motion.value.ValueType<Vec3> = new motion.value.ValueType("vec3", ({
    binaryOp,
    unaryOp,
    property,
}) => {
    binaryOp("+", Vec3Type, Vec3Type, ([x1, y1, z1], [x2, y2, z2]) => [x1 + x2, y1 + y2, z1 + z2] as const);
    binaryOp("-", Vec3Type, Vec3Type, ([x1, y1, z1], [x2, y2, z2]) => [x1 - x2, y1 - y2, z1 - z2] as const);
    binaryOp("*", Vec3Type, Vec3Type, ([x1, y1, z1], [x2, y2, z2]) => [x1 * x2, y1 * y2, z1 * z2] as const);
    binaryOp("/", Vec3Type, Vec3Type, ([x1, y1, z1], [x2, y2, z2]) => [x1 / x2, y1 / y2, z1 / z2] as const);
    binaryOp("+", NumberType, Vec3Type, ([x, y, z], s) => [x + s, y + s, z + s] as const);
    binaryOp("-", NumberType, Vec3Type, ([x, y, z], s) => [x - s, y - s, z - s] as const);
    binaryOp("*", NumberType, Vec3Type, ([x, y, z], s) => [x * s, y * s, z * s] as const);
    binaryOp("/", NumberType, Vec3Type, ([x, y, z], s) => [x / s, y / s, z / s] as const);
    binaryOp("==", Vec3Type, BooleanType, ([x1, y1], [x2, y2]) => x1 == x2 && y1 == y2);
    binaryOp("!=", Vec3Type, BooleanType, ([x1, y1], [x2, y2]) => x1 != x2 && y1 != y2);

    unaryOp("+", Vec3Type, ([x, y, z]) => [+x, +y, +z] as const);
    unaryOp("-", Vec3Type, ([x, y, z]) => [-x, -y, -z] as const);

    property("x", NumberType, (v) => v[0]);
    property("y", NumberType, (v) => v[1]);
    property("z", NumberType, (v) => v[2]);

    swizzle("xyz", Vec2Type, 2, property, (self, index) => self[index]);
    swizzle("xyz", Vec3Type, 3, property, (self, index) => self[index]);
});

export const vec2: motion.value.Value<void> = new motion.value.ValueType<void>("vec2", ({ callable }) => {
    callable([], Vec2Type, () => [0, 0] as const);
    callable([NumberType], Vec2Type, (_, x) => [x, x] as const);
    callable([NumberType, NumberType], Vec2Type, (_, x, y) => [x, y] as const);
}).of();

export const vec3: motion.value.Value<void> = new motion.value.ValueType<void>("vec3", ({ callable }) => {
    callable([], Vec3Type, () => [0, 0, 0] as const);
    callable([NumberType], Vec3Type, (_, x) => [x, x, x] as const);
    callable([Vec2Type, NumberType], Vec3Type, (_, [x, y], z) => [x, y, z] as const);
    callable([NumberType, Vec2Type], Vec3Type, (_, x, [y, z]) => [x, y, z] as const);
    callable([NumberType, NumberType, NumberType], Vec3Type, (_, x, y, z) => [x, y, z] as const);
}).of();

export const bundle: motion.bundle.Bundle = new motion.bundle.BundleBuilder()
    .global("vec2", vec2)
    .global("vec3", vec3)
    .build();
