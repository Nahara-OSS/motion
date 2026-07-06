import * as motion from "@nahara/motion";

const { NumberType, StringType, BooleanType } = motion.value;

export const number: motion.value.Value<void> = new motion.value.ValueType<void>("number", ({ callable }) => {
    callable([], NumberType, () => 0);
    callable([StringType], NumberType, (_, x) => Number(x));
    callable([BooleanType], NumberType, (_, x) => x ? 1 : 0);
}).of();

export const boolean: motion.value.Value<void> = new motion.value.ValueType<void>("boolean", ({ callable }) => {
    callable([], BooleanType, () => false);
    callable([NumberType], BooleanType, (_, x) => x != 0);
    callable([StringType], BooleanType, (_, x) => x != "false");
}).of();

export const string: motion.value.Value<void> = new motion.value.ValueType<void>("string", ({ callable }) => {
    callable([], StringType, () => "");
    callable([NumberType], StringType, (_, x) => x.toString());
    callable([BooleanType], StringType, (_, x) => x.toString());
}).of();

export const bundle: motion.bundle.Bundle = new motion.bundle.BundleBuilder()
    .global("number", number)
    .global("boolean", boolean)
    .global("string", string)
    .build();
