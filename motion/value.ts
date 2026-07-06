/**
 * Value type and value system for Nahara's Motion.
 *
 * To evaluate value, use `evalValue()`. To find the type from expression, use `evalType()`. The value system only
 * provides 3 primitive types out of the box: `NumberType`, `StringType` and `BooleanType`, which are the 3 primitives
 * that can be produced from expressions. The global variables and references are only provided when evaluating value
 * or type.
 *
 * @module
 */

import type { BinaryOperator, Expression, ExpressionError, UnaryOperator } from "./expression.ts";

export interface ValueTypeComponent {
    readonly hideInDocs: boolean;
}

export interface BinarySignature<T> extends ValueTypeComponent {
    readonly type: ValueType<unknown>;
    readonly apply: (a: T, b: unknown) => unknown;
}

export interface UnarySignature<T> extends ValueTypeComponent {
    readonly type: ValueType<unknown>;
    readonly apply: (a: T) => unknown;
}

export interface CallableSignature<T> extends ValueTypeComponent {
    readonly paramTypes: ValueType<unknown>[];
    readonly returnType: ValueType<unknown>;
    readonly apply: (self: T, ...params: unknown[]) => unknown;
}

interface ValueTypeInternals<T> {
    binaryOps: Map<BinaryOperator, Map<ValueType<unknown>, BinarySignature<T>>>;
    unaryOps: Map<UnaryOperator, UnarySignature<T>>;
    properties: Map<string, UnarySignature<T>>;
    callables: CallableSignature<T>[];
}

export class ValueType<T> {
    #cached: ValueTypeInternals<T> | null = null;

    constructor(
        public readonly label: string,
        private readonly defer: (builder: ValueTypeBuilder<T>) => unknown,
    ) {}

    #getInternals(): ValueTypeInternals<T> {
        if (this.#cached == null) {
            const methods = new Map<string, CallableSignature<T>[]>();
            const internals: ValueTypeInternals<T> = {
                binaryOps: new Map(),
                unaryOps: new Map(),
                properties: new Map(),
                callables: [],
            };

            const binaryOp: ValueTypeBuilder<T>["binaryOp"] = (kind, otherType, returnType, apply) => {
                const list = internals.binaryOps.getOrInsertComputed(kind, () => new Map());
                const sig = { hideInDocs: false, type: returnType, apply };

                const settings = {
                    hideInDocs: () => {
                        sig.hideInDocs = true;
                        return settings;
                    },
                };

                list.set(otherType as ValueType<unknown>, sig as BinarySignature<T>);
                return settings;
            };

            const unaryOp: ValueTypeBuilder<T>["unaryOp"] = (kind, returnType, apply) => {
                const sig = { hideInDocs: false, type: returnType, apply };

                const settings = {
                    hideInDocs: () => {
                        sig.hideInDocs = true;
                        return settings;
                    },
                };

                internals.unaryOps.set(kind, sig as UnarySignature<T>);
                return settings;
            };

            const property: ValueTypeBuilder<T>["property"] = (name, type, apply) => {
                const sig = { hideInDocs: false, type, apply };

                const settings = {
                    hideInDocs: () => {
                        sig.hideInDocs = true;
                        return settings;
                    },
                };

                internals.properties.set(name, sig as UnarySignature<T>);
                return settings;
            };

            const callable: ValueTypeBuilder<T>["callable"] = (paramTypes, returnType, apply) => {
                const sig = { hideInDocs: false, paramTypes, returnType, apply };

                const settings = {
                    hideInDocs: () => {
                        sig.hideInDocs = true;
                        return settings;
                    },
                };

                internals.callables.push(sig as CallableSignature<T>);
                return settings;
            };

            const method: ValueTypeBuilder<T>["method"] = (name, paramTypes, returnType, apply) => {
                const list = methods.getOrInsert(name, []);
                const sig = { hideInDocs: false, paramTypes, returnType, apply };

                const settings = {
                    hideInDocs: () => {
                        sig.hideInDocs = true;
                        return settings;
                    },
                };

                list.push(sig as CallableSignature<T>);
                return settings;
            };

            this.defer({
                binaryOp,
                unaryOp,
                property,
                callable,
                method,
            });

            for (const [name, signatures] of methods) {
                const type = new ValueType(this.label + "." + name, ({ callable }) => {
                    for (const { paramTypes, returnType, apply } of signatures) {
                        // deno-lint-ignore no-explicit-any
                        callable(paramTypes, returnType, apply as any);
                    }
                });

                property(name, type, (v) => v);
            }

            this.#cached = internals;
        }

        return this.#cached!;
    }

    /**
     * All binary operator signatures for this type.
     *
     * The key for top-level map is the binary operator kind and the key for next level is the value type for second
     * (right-hand side) value.
     */
    get binaryOps(): ReadonlyMap<BinaryOperator, ReadonlyMap<ValueType<unknown>, BinarySignature<T>>> {
        return this.#getInternals().binaryOps;
    }

    /**
     * All unary operator signatures for this type.
     */
    get unaryOps(): ReadonlyMap<UnaryOperator, UnarySignature<T>> {
        return this.#getInternals().unaryOps;
    }

    /**
     * All properties in this type.
     */
    get properties(): ReadonlyMap<string, UnarySignature<T>> {
        return this.#getInternals().properties;
    }

    /**
     * All call signatures for this type.
     *
     * If the type is not callable, the signature list will be empty.
     */
    get callables(): readonly CallableSignature<T>[] {
        return this.#getInternals().callables;
    }

    /**
     * Create value of this type from data.
     *
     * @param data Data of the value
     * @returns The value
     */
    of(data: T): Value<T> {
        return { type: this, data };
    }
}

export interface Value<T> {
    readonly type: ValueType<T>;
    readonly data: T;
}

export interface ValueTypeBuilder<T> {
    /**
     * Add new binary operator.
     *
     * @param kind Binary operator
     * @param otherType Type of second value
     * @param returnType Type of return value
     * @param apply Apply function
     */
    binaryOp<P, R>(
        kind: BinaryOperator,
        otherType: ValueType<P>,
        returnType: ValueType<R>,
        apply: (a: T, b: P) => R,
    ): ValueTypeComponentSettings;

    /**
     * Add new unary operator.
     *
     * @param kind Unary operator
     * @param returnType Type of return value
     * @param apply Apply function
     */
    unaryOp<R>(
        kind: UnaryOperator,
        returnType: ValueType<R>,
        apply: (value: T) => R,
    ): ValueTypeComponentSettings;

    /**
     * Add new callable signature.
     *
     * @param paramTypes Parameter types
     * @param returnType Return type
     * @param apply Apply function
     */
    callable<P extends unknown[], R>(
        paramTypes: { [x in keyof P]: ValueType<P[x]> },
        returnType: ValueType<R>,
        apply: (self: T, ...params: P) => R,
    ): ValueTypeComponentSettings;

    /**
     * Add new property.
     *
     * @param name Name of property
     * @param type Property value type
     * @param apply Apply function
     */
    property<R>(
        name: string,
        type: ValueType<R>,
        apply: (value: T) => R,
    ): ValueTypeComponentSettings;

    /**
     * Add new property that returns callable value.
     *
     * This is a combination of creating new callable value type and adding a new property that yield the value with
     * that callable type. The following snippet:
     *
     * ```typescript
     * method(name, paramTypes1, returnType1, apply1);
     * method(name, paramTypes2, returnType2, apply2);
     * // ...
     * ```
     *
     * is the equivalent of the following snippet:
     *
     * ```typescript
     * property(name, new ValueType<T>(({ callable }) => {
     *     callable(paramTypes1, returnType1, apply1);
     *     callable(paramTypes2, returnType2, apply2);
     *     // ...
     * }), v => v);
     * ```
     *
     * @param name Name of property
     * @param paramTypes Parameter types
     * @param returnType Return type
     * @param apply Apply function
     */
    method<P extends unknown[], R>(
        name: string,
        paramTypes: { [x in keyof P]: ValueType<P[x]> },
        returnType: ValueType<R>,
        apply: (self: T, ...params: P) => R,
    ): ValueTypeComponentSettings;
}

export interface ValueTypeComponentSettings {
    /**
     * Hide the component from inline docs.
     *
     * Used by swizzle generator to hide the generated swizzle properties for vectors.
     */
    hideInDocs(): this;
}

/**
 * Evaluate value type from expression.
 *
 * Type evaluation is mainly used for showing the contextual documentation to user while entering the expression.
 *
 * @param options Options
 */
export function evalType(options: EvalOptions<ValueType<unknown>>): EvalResult<ValueType<unknown>> {
    const { expression, lookupVariable, lookupReference } = options;

    switch (expression.type) {
        case "primitive": {
            switch (typeof expression.value) {
                case "string":
                    return { expression, type: "success", value: StringType as ValueType<unknown> };
                case "number":
                    return { expression, type: "success", value: NumberType as ValueType<unknown> };
                case "boolean":
                    return { expression, type: "success", value: BooleanType as ValueType<unknown> };
                default:
                    throw new Error(`Primitive type not implemented: ${typeof expression.value}`);
            }
        }

        case "variable": {
            const value = lookupVariable(expression.name);
            if (value == null) return { expression, type: "eval-error", kind: "no-variable", name: expression.name };
            return { expression, type: "success", value };
        }

        case "reference": {
            const value = lookupReference(expression.name);
            if (value == null) return { expression, type: "eval-error", kind: "no-reference", name: expression.name };
            return { expression, type: "success", value };
        }

        case "property-access": {
            const base = evalType({ ...options, expression: expression.of });
            if (base.type != "success") return base;

            const property = base.value.properties.get(expression.property);

            if (property == null) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "no-property",
                    from: base.value,
                    name: expression.property,
                };
            }

            return { expression, type: "success", value: property.type };
        }

        case "binary-operator": {
            const lhs = evalType({ ...options, expression: expression.left });
            const rhs = evalType({ ...options, expression: expression.right });
            if (lhs.type != "success") return lhs;
            if (rhs.type != "success") return rhs;

            const op = lhs.value.binaryOps.get(expression.operator)?.get(rhs.value);

            if (op == null) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "no-binary-operator",
                    lhs: lhs.value,
                    rhs: rhs.value,
                    op: expression.operator,
                };
            }

            return { expression, type: "success", value: op.type };
        }

        case "unary-operator": {
            const base = evalType({ ...options, expression: expression.of });
            if (base.type != "success") return base;

            const op = base.value.unaryOps.get(expression.operator);

            if (op == null) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "no-unary-operator",
                    from: base.value,
                    op: expression.operator,
                };
            }

            return { expression, type: "success", value: op.type };
        }

        case "call": {
            const base = evalType({ ...options, expression: expression.of });
            const params = expression.parameters.map((expression) => evalType({ ...options, expression }));

            if (base.type != "success") return base;
            for (const param of params) if (param.type != "success") return param;

            const paramTypes = params.map((p) => p.type == "success" ? p.value : null);
            const callables = base.value.callables;

            if (callables.length == 0) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "not-callable",
                    from: base.value,
                };
            }

            const signature = callables.find((s) =>
                s.paramTypes.length == paramTypes.length && s.paramTypes.every((t, i) => t == paramTypes[i])
            );

            if (signature == null) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "no-signature",
                    from: base.value,
                    parameters: paramTypes as ValueType<unknown>[],
                };
            }

            return { expression, type: "success", value: signature.returnType };
        }

        case "conditional": {
            const condition = evalType({ ...options, expression: expression.condition });
            const ifTrue = evalType({ ...options, expression: expression.ifTrue });
            const ifFalse = evalType({ ...options, expression: expression.ifFalse });
            if (condition.type != "success") return condition;
            if (ifTrue.type != "success") return ifTrue;
            if (ifFalse.type != "success") return ifFalse;

            if (condition.value != BooleanType) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "type-mismatch",
                    expect: BooleanType as ValueType<unknown>,
                    found: condition.value,
                };
            }

            if (ifTrue.value != ifFalse.value) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "type-mismatch",
                    expect: ifTrue.value,
                    found: ifFalse.value,
                };
            }

            return { expression, type: "success", value: ifTrue.value };
        }

        case "error": {
            return { expression, type: "expr-error", error: expression.error };
        }
    }
}

/**
 * Evaluate value from expression.
 *
 * Use this function to evaluate value from expression in runtime. To lookup type without doing actual computation, use
 * `evalType()`.
 *
 * @param options Options
 */
export function evalValue(options: EvalOptions<Value<unknown>>): EvalResult<Value<unknown>> {
    const { expression, lookupVariable, lookupReference } = options;

    switch (expression.type) {
        case "primitive": {
            switch (typeof expression.value) {
                case "string":
                    return { expression, type: "success", value: StringType.of(expression.value) as Value<unknown> };
                case "number":
                    return { expression, type: "success", value: NumberType.of(expression.value) as Value<unknown> };
                case "boolean":
                    return { expression, type: "success", value: BooleanType.of(expression.value) as Value<unknown> };
                default:
                    throw new Error(`Primitive type not implemented: ${typeof expression.value}`);
            }
        }

        case "variable": {
            const value = lookupVariable(expression.name);
            if (value == null) return { expression, type: "eval-error", kind: "no-variable", name: expression.name };
            return { expression, type: "success", value };
        }

        case "reference": {
            const value = lookupReference(expression.name);
            if (value == null) return { expression, type: "eval-error", kind: "no-reference", name: expression.name };
            return { expression, type: "success", value };
        }

        case "property-access": {
            const base = evalValue({ ...options, expression: expression.of });
            if (base.type != "success") return base;

            const property = base.value.type.properties.get(expression.property);

            if (property == null) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "no-property",
                    from: base.value,
                    name: expression.property,
                };
            }

            return {
                expression,
                type: "success",
                value: {
                    type: property.type,
                    data: property.apply(base.value.data),
                },
            };
        }

        case "binary-operator": {
            const lhs = evalValue({ ...options, expression: expression.left });
            const rhs = evalValue({ ...options, expression: expression.right });
            if (lhs.type != "success") return lhs;
            if (rhs.type != "success") return rhs;

            const op = lhs.value.type.binaryOps.get(expression.operator)?.get(rhs.value.type);

            if (op == null) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "no-binary-operator",
                    lhs: lhs.value,
                    rhs: rhs.value,
                    op: expression.operator,
                };
            }

            return {
                expression,
                type: "success",
                value: {
                    type: op.type,
                    data: op.apply(lhs.value.data, rhs.value.data),
                },
            };
        }

        case "unary-operator": {
            const base = evalValue({ ...options, expression: expression.of });
            if (base.type != "success") return base;

            const op = base.value.type.unaryOps.get(expression.operator);

            if (op == null) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "no-unary-operator",
                    from: base.value,
                    op: expression.operator,
                };
            }

            return {
                expression,
                type: "success",
                value: {
                    type: op.type,
                    data: op.apply(base.value.data),
                },
            };
        }

        case "call": {
            const base = evalValue({ ...options, expression: expression.of });
            const params = expression.parameters.map((expression) => evalValue({ ...options, expression }));

            if (base.type != "success") return base;
            for (const param of params) if (param.type != "success") return param;

            const paramValues = params.map((p) => p.type == "success" ? p.value : null);
            const callables = base.value.type.callables;

            if (callables.length == 0) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "not-callable",
                    from: base.value,
                };
            }

            const signature = callables.find((s) =>
                s.paramTypes.length == paramValues.length && s.paramTypes.every((t, i) => t == paramValues[i]?.type)
            );

            if (signature == null) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "no-signature",
                    from: base.value,
                    parameters: paramValues as Value<unknown>[],
                };
            }

            return {
                expression,
                type: "success",
                value: {
                    type: signature.returnType,
                    data: signature.apply(base.value.data, ...paramValues.map((v) => v?.data)),
                },
            };
        }

        case "conditional": {
            const condition = evalValue({ ...options, expression: expression.condition });
            if (condition.type != "success") return condition;

            if (condition.value.type != BooleanType) {
                return {
                    expression,
                    type: "eval-error",
                    kind: "type-mismatch",
                    expect: BooleanType as ValueType<unknown>,
                    found: condition.value,
                };
            }

            return {
                ...evalValue({ ...options, expression: condition.value.data ? expression.ifTrue : expression.ifFalse }),
                expression,
            };
        }

        case "error": {
            return { expression, type: "expr-error", error: expression.error };
        }
    }
}

export interface EvalOptions<T> {
    readonly expression: Expression;
    readonly lookupVariable: (name: string) => T | null;
    readonly lookupReference: (name: string) => T | null;
}

export type EvalResult<T> =
    & ({ readonly expression: Expression })
    & (
        | { readonly type: "success"; readonly value: T }
        | { readonly type: "expr-error"; readonly error: ExpressionError }
        | (
            & { readonly type: "eval-error" }
            & (
                | { readonly kind: "no-variable" | "no-reference"; readonly name: string }
                | { readonly kind: "no-property"; readonly from: T; readonly name: string }
                | { readonly kind: "no-binary-operator"; readonly lhs: T; readonly rhs: T; readonly op: BinaryOperator }
                | { readonly kind: "no-unary-operator"; readonly from: T; readonly op: UnaryOperator }
                | { readonly kind: "not-callable"; readonly from: T }
                | { readonly kind: "no-signature"; readonly from: T; readonly parameters: readonly T[] }
                | { readonly kind: "type-mismatch"; readonly expect: ValueType<unknown>; readonly found: T }
            )
        )
    );

export const NumberType: ValueType<number> = new ValueType("number", ({ binaryOp, unaryOp }) => {
    binaryOp("+", NumberType, NumberType, (a, b) => a + b);
    binaryOp("-", NumberType, NumberType, (a, b) => a - b);
    binaryOp("*", NumberType, NumberType, (a, b) => a * b);
    binaryOp("/", NumberType, NumberType, (a, b) => a / b);
    binaryOp(">", NumberType, BooleanType, (a, b) => a > b);
    binaryOp("<", NumberType, BooleanType, (a, b) => a < b);
    binaryOp(">=", NumberType, BooleanType, (a, b) => a >= b);
    binaryOp("<=", NumberType, BooleanType, (a, b) => a <= b);
    binaryOp("==", NumberType, BooleanType, (a, b) => a == b);
    binaryOp("!=", NumberType, BooleanType, (a, b) => a != b);

    unaryOp("+", NumberType, (v) => v);
    unaryOp("-", NumberType, (v) => -v);
});

export const BooleanType: ValueType<boolean> = new ValueType("boolean", ({ binaryOp, unaryOp }) => {
    binaryOp("&&", BooleanType, BooleanType, (a, b) => a && b);
    binaryOp("||", BooleanType, BooleanType, (a, b) => a || b);
    binaryOp("==", BooleanType, BooleanType, (a, b) => a == b);
    binaryOp("!=", BooleanType, BooleanType, (a, b) => a != b);

    unaryOp("!", BooleanType, (v) => !v);
});

export const StringType: ValueType<string> = new ValueType("string", ({ binaryOp, property, method }) => {
    binaryOp("+", StringType, StringType, (a, b) => a + b);
    binaryOp("==", StringType, BooleanType, (a, b) => a == b);
    binaryOp("!=", StringType, BooleanType, (a, b) => a != b);

    property("length", NumberType, (v) => v.length);

    method("substr", [NumberType], StringType, (self, offset) => self.substring(offset));
    method("substr", [NumberType, NumberType], StringType, (self, start, end) => self.substring(start, end));
    method("toUpper", [], StringType, (self) => self.toUpperCase());
    method("toLower", [], StringType, (self) => self.toLowerCase());
    method("trim", [], StringType, (self) => self.trim());
    method("trimStart", [], StringType, (self) => self.trimStart());
    method("trimEnd", [], StringType, (self) => self.trimEnd());
    method("padStart", [NumberType], StringType, (self, max) => self.padStart(max));
    method("padStart", [NumberType, StringType], StringType, (self, max, pattern) => self.padStart(max, pattern));
    method("padEnd", [NumberType], StringType, (self, max) => self.padEnd(max));
    method("padEnd", [NumberType, StringType], StringType, (self, max, pattern) => self.padEnd(max, pattern));
});
