import * as motion from "@nahara/motion";
import { Vec2Type, Vec3Type } from "../expr/vector.ts";

/**
 * Animatable property.
 *
 * - `animator`: Property is not animated when all animators have exactly 1 keyframe at the same time coordiante, or
 *   animated otherwise;
 * - `expression`: Property is animated using math expression and animators.
 */
export type AnimatableProperty<T extends readonly number[]> =
    | {
        type: "animator";
        channels: { [x in keyof T]: motion.animation.Animator };
    }
    | {
        type: "expression";
        channels: T["length"];
        expression: string;
        animators: Readonly<Record<string, motion.animation.Animator>>;
    };

/**
 * Get value type based on property.
 *
 * @param prop Animatable property
 * @returns Value type associated with property
 */
export function valueTypeOf(prop: AnimatableProperty<readonly number[]>): motion.value.ValueType<unknown> {
    const channels = prop.type == "animator" ? prop.channels.length : prop.channels;
    const types = [null, motion.value.NumberType, Vec2Type, Vec3Type];
    const type = types[channels];
    if (type == null) throw new Error(`${channels}-channel property is not supported`);
    return type as motion.value.ValueType<unknown>;
}

/**
 * Evaluate animatable property value.
 *
 * If the type from expression evaluation is neither `number` nor `number[]`, the result will be filled with zeros.
 *
 * @param options Evaluate options
 * @returns Evaluated value
 */
export function evalPropertyValue<T extends readonly number[]>(options: EvalPropertyValueOptions<T>): T {
    const { property, tickRate, lookupVariable, lookupReference } = options;

    switch (property.type) {
        case "animator": {
            const time = motion.value.NumberType.dataOf(lookupVariable(motion.scene.SceneRenderer.VARIABLE_TIME)) ?? 0;
            const tick = Math.floor(time * tickRate);
            return property.channels.map((animator) => motion.animation.sampleAnimator(animator, tick)) as unknown as T;
        }

        case "expression": {
            const value: number[] = new Array(property.channels).fill(0);
            const evaluated = motion.value.evalValue({
                expression: motion.expr.parse(property.expression),
                lookupVariable,
                lookupReference,
            });

            if (evaluated.type == "success") {
                if (typeof evaluated.value.data == "number") {
                    value[0] = evaluated.value.data;
                }

                if (evaluated.value.data instanceof Array) {
                    for (let i = 0; i < Math.min(value.length, evaluated.value.data.length); i++) {
                        value[i] = evaluated.value.data[i];
                    }
                }
            }

            return value as unknown as T;
        }
    }
}

export interface EvalPropertyValueOptions<T extends readonly number[]> {
    readonly property: AnimatableProperty<T>;
    readonly tickRate: number;
    readonly lookupVariable: (name: string) => motion.value.Value<unknown> | null;
    readonly lookupReference: (name: string) => motion.value.Value<unknown> | null;
}
