import * as motion from "@nahara/motion";

import { type Vec2, Vec2Type, type Vec3, Vec3Type } from "./vector.ts";

const { NumberType } = motion.value;

function scalarFunction(label: string, apply: (x: number) => number): motion.value.Value<void> {
    return {
        type: new motion.value.ValueType(label, ({ callable }) => {
            callable([NumberType], NumberType, (_, x) => apply(x));
            callable([Vec2Type], Vec2Type, (_, v) => v.map((x) => apply(x)) as unknown as Vec2);
            callable([Vec3Type], Vec3Type, (_, v) => v.map((x) => apply(x)) as unknown as Vec3);
        }),
        data: undefined,
    };
}

export const pi: motion.value.Value<number> = motion.value.NumberType.of(Math.PI);
export const e: motion.value.Value<number> = motion.value.NumberType.of(Math.E);

export const abs: motion.value.Value<void> = scalarFunction("abs", Math.abs);
export const floor: motion.value.Value<void> = scalarFunction("floor", Math.floor);
export const ceil: motion.value.Value<void> = scalarFunction("ceil", Math.ceil);
export const round: motion.value.Value<void> = scalarFunction("round", Math.round);
export const sqrt: motion.value.Value<void> = scalarFunction("sqrt", Math.sqrt);
export const exp: motion.value.Value<void> = scalarFunction("exp", Math.exp);
export const log: motion.value.Value<void> = scalarFunction("log", Math.log);
export const sin: motion.value.Value<void> = scalarFunction("sin", Math.sin);
export const cos: motion.value.Value<void> = scalarFunction("cos", Math.cos);
export const tan: motion.value.Value<void> = scalarFunction("tan", Math.tan);
export const asin: motion.value.Value<void> = scalarFunction("asin", Math.asin);
export const acos: motion.value.Value<void> = scalarFunction("acos", Math.acos);
export const atan: motion.value.Value<void> = scalarFunction("atan", Math.atan);

export const atan2: motion.value.Value<void> = new motion.value.ValueType<void>("atan2", ({ callable }) => {
    callable([NumberType, NumberType], NumberType, (_, y, x) => Math.atan2(y, x));
}).of();

export const pow: motion.value.Value<void> = new motion.value.ValueType<void>("pow", ({ callable }) => {
    callable([NumberType, NumberType], NumberType, (_, x, y) => Math.pow(x, y));
    callable([Vec2Type, NumberType], Vec2Type, (_, v, p) => v.map((x) => Math.pow(x, p)) as unknown as Vec2);
    callable([Vec3Type, NumberType], Vec3Type, (_, v, p) => v.map((x) => Math.pow(x, p)) as unknown as Vec3);
}).of();

export const dot: motion.value.Value<void> = new motion.value.ValueType<void>("dot", ({ callable }) => {
    callable([Vec2Type, Vec2Type], NumberType, (_, [x1, y1], [x2, y2]) => x1 * y1 + x2 * y2);
    callable([Vec3Type, Vec3Type], NumberType, (_, [x1, y1, z1], [x2, y2, z2]) => x1 * y1 + x2 * y2 + z1 * z2);
}).of();

export const cross: motion.value.Value<void> = new motion.value.ValueType<void>("cross", ({ callable }) => {
    callable([Vec3Type, Vec3Type], Vec3Type, (_, [x1, y1, z1], [x2, y2, z2]) => {
        const x = y1 * z2 - z1 * y2;
        const y = z1 * x2 - x1 * z2;
        const z = x1 * y2 - y1 * x2;
        return [x, y, z] as const;
    });
}).of();

export const length: motion.value.Value<void> = new motion.value.ValueType<void>("length", ({ callable }) => {
    callable([Vec2Type], NumberType, (_, [x, y]) => Math.sqrt(x * x + y * y));
    callable([Vec3Type], NumberType, (_, [x, y, z]) => Math.sqrt(x * x + y * y + z * z));
}).of();

export const bundle: motion.bundle.Bundle = new motion.bundle.BundleBuilder()
    .global("pi", pi)
    .global("e", e)
    .global("abs", abs)
    .global("floor", floor)
    .global("ceil", ceil)
    .global("round", round)
    .global("sqrt", sqrt)
    .global("exp", exp)
    .global("log", log)
    .global("sin", sin)
    .global("cos", cos)
    .global("tan", tan)
    .global("asin", asin)
    .global("acos", acos)
    .global("atan", atan)
    .global("atan2", atan2)
    .global("pow", pow)
    .global("dot", dot)
    .global("cross", cross)
    .global("length", length)
    .build();
