import * as motion from "@nahara/motion";
import { type Vec3, Vec3Type } from "./vector.ts";

const { NumberType } = motion.value;

export const rgb: motion.value.Value<void> = new motion.value.ValueType<void>("rgb", ({ callable }) => {
    callable([NumberType, NumberType, NumberType], Vec3Type, (_, r, g, b) => {
        const v = [r, g, b];
        return v.map((v) => Math.max(Math.min(v / 255, 1), 0)) as unknown as Vec3;
    });
}).of();

export const hsl: motion.value.Value<void> = new motion.value.ValueType<void>("hsl", ({ callable }) => {
    callable([NumberType, NumberType, NumberType], Vec3Type, (_, h, s, l) => {
        h = (((h % 360) + 360) % 360) / 60;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h % 2) - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 1) [r, g, b] = [c, x, 0];
        else if (h < 2) [r, g, b] = [x, c, 0];
        else if (h < 3) [r, g, b] = [0, c, x];
        else if (h < 4) [r, g, b] = [0, x, c];
        else if (h < 5) [r, g, b] = [x, 0, c];
        else if (h < 6) [r, g, b] = [c, 0, x];
        else [r, g, b] = [c, x, 0];
        return [r + m, g + m, b + m] as const;
    });
}).of();

// TODO: oklab and oklch

export const bundle: motion.bundle.Bundle = new motion.bundle.BundleBuilder()
    .global("rgb", rgb)
    .global("hsl", hsl)
    .build();
