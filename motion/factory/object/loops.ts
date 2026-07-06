import * as motion from "@nahara/motion";
import { type AnimatableProperty, evalPropertyValue } from "./properties.ts";

export interface RepeatObject {
    readonly start: AnimatableProperty<[number]>;
    readonly end: AnimatableProperty<[number]>;
    readonly step: AnimatableProperty<[number]>;
}

export const RepeatObject: motion.object.ObjectType<RepeatObject, number> = {
    typeId: "nahara:loops/repeat",
    valueType: motion.value.NumberType,

    createDefault: () => ({
        start: { type: "animator", channels: [motion.animation.constant(1)] },
        end: { type: "animator", channels: [motion.animation.constant(1)] },
        step: { type: "animator", channels: [motion.animation.constant(1)] },
    }),

    createGlobalRenderer: () => ({
        createLocalRenderer: () => ({
            render: (info) => {
                const { state, renderChildren } = info;
                const [start] = evalPropertyValue({ ...info, property: state.start });
                const [end] = evalPropertyValue({ ...info, property: state.end });
                const [step] = evalPropertyValue({ ...info, property: state.step });

                if (step <= 0) return;

                for (let x = start; x <= end; x += step) {
                    renderChildren({ value: x });
                }
            },
        }),
    }),
};

export const bundle: motion.bundle.Bundle = new motion.bundle.BundleBuilder()
    .objectType(RepeatObject)
    .build();
