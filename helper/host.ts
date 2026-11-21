/**
 * Host-side type, function and component support
 *
 * This submodule provide helper functions to help creating host-side module elements.
 *
 * @module
 */

import * as motion from "@nahara/motion";
import * as annotation from "./annotation.ts";

export interface LabelingOptions {
    readonly name?: string;
    readonly description?: string | Iterable<string>;
    readonly debugName?: string;
}

export const LabelingOptions: {
    readonly toAnnotations: (options: LabelingOptions) => motion.annotation.Annotation[];
} = {
    toAnnotations: ({ name, description }) => {
        const result: motion.annotation.Annotation[] = [];

        if (name != null || description != null) {
            result.push(annotation.Editor.toAnnotation({
                name: name ?? null,
                description: description == null
                    ? null
                    : typeof description == "string"
                    ? description
                    : [...description].join("\n"),
            }));
        }

        return result;
    },
};

export interface ElementOptions extends LabelingOptions {
    readonly typeParams?: readonly TypeParameterOptions[];
}

export const ElementOptions: {
    readonly createTypeParams: (options: ElementOptions) => [
        motion.runtime.TypeParameter[],
        Map<string, motion.runtime.TypeParameter>,
    ];
} = {
    createTypeParams: (options) => {
        const list: motion.runtime.TypeParameter[] = [];
        const map = new Map<string, motion.runtime.TypeParameter>();

        for (const { id, ...labelingOptions } of options.typeParams ?? []) {
            const typeParam = new motion.runtime.TypeParameter(
                LabelingOptions.toAnnotations(labelingOptions),
            );
            list.push(typeParam);
            map.set(id, typeParam);
        }

        return [list, map];
    },
};

export interface TypeParameterOptions extends LabelingOptions {
    readonly id: string;
}

export type Type = {
    readonly kind: motion.model.TypeKind.Concrete;
    readonly decl: motion.runtime.TypeDecl;
    readonly typeParams: readonly Type[];
} | {
    readonly kind: motion.model.TypeKind.Parameterized;
    readonly id: string;
};

export const Type: {
    readonly concrete: (decl: motion.runtime.TypeDecl, typeParams?: readonly Type[]) => Type;
    readonly parameterized: (id: string) => Type;
    readonly convert: (type: Type, idToTypeParam: Map<string, motion.runtime.TypeParameter>) => motion.runtime.Type;
} = {
    concrete: (decl, typeParams = []) => ({ kind: motion.model.TypeKind.Concrete, decl, typeParams }),
    parameterized: (id) => ({ kind: motion.model.TypeKind.Parameterized, id }),

    convert: (type, idToTypeParam) => {
        switch (type.kind) {
            case motion.model.TypeKind.Concrete: {
                const { decl } = type;
                const typeParams = type.typeParams.map((type) => Type.convert(type, idToTypeParam));
                return new motion.runtime.ConcreteType(decl, typeParams);
            }

            case motion.model.TypeKind.Parameterized: {
                return idToTypeParam.get(type.id)!;
            }
        }
    },
};

export interface FunctionOptions extends ElementOptions {
    readonly inputs: readonly InputOptions[];
    readonly output: Type;
    // deno-lint-ignore no-explicit-any
    readonly fn: (typeParams: readonly motion.runtime.RuntimeType[], ...inputs: any[]) => any;
}

export interface InputOptions extends LabelingOptions {
    readonly type: Type;
}

export class HostFunction extends motion.runtime.Function {
    // deno-lint-ignore no-explicit-any
    #fn: (typeParams: readonly motion.runtime.RuntimeType[], ...inputs: any[]) => any;

    override annotations: readonly motion.annotation.Annotation[];
    override typeParams: motion.runtime.TypeParameter[];
    override inputs: readonly motion.runtime.Input[];
    override outputType: motion.runtime.Type;

    constructor(options: FunctionOptions) {
        super();
        const [typeParams, idToTypeParam] = ElementOptions.createTypeParams(options);
        this.annotations = LabelingOptions.toAnnotations(options);
        this.typeParams = typeParams;
        this.inputs = options.inputs.map(({ type, ...options }) => ({
            annotations: LabelingOptions.toAnnotations(options),
            inputType: Type.convert(type, idToTypeParam),
        }));
        this.outputType = Type.convert(options.output, idToTypeParam);
        this.#fn = options.fn;
    }

    // deno-lint-ignore no-explicit-any
    override invoke(typeParams: readonly motion.runtime.RuntimeType[], ...inputs: any[]): unknown {
        return this.#fn(typeParams, ...inputs);
    }
}

export interface TypeOptions<T> extends ElementOptions {
    readonly default: (typeParams: readonly motion.runtime.RuntimeType[]) => T;
}

export class HostNativeType<T> extends motion.runtime.TypeDecl {
    #default: (typeParams: readonly motion.runtime.RuntimeType[]) => T;

    override annotations: readonly motion.annotation.Annotation[];
    override typeParams: readonly motion.runtime.TypeParameter[];

    constructor(options: TypeOptions<T>) {
        super();
        const [typeParams] = ElementOptions.createTypeParams(options);
        this.annotations = LabelingOptions.toAnnotations(options);
        this.typeParams = typeParams;
        this.#default = options.default;
    }

    override default(typeParams: readonly motion.runtime.RuntimeType[]): T {
        return this.#default(typeParams);
    }
}

export interface StructOptions<T> extends TypeOptions<T> {
    readonly create: (
        typeParams: readonly motion.runtime.RuntimeType[],
        // deno-lint-ignore no-explicit-any
        fields: Readonly<Partial<Record<string, any>>>,
    ) => T;
    readonly fields: Readonly<Record<string, FieldOptions<T>>>;
}

export interface FieldOptions<T> extends LabelingOptions {
    readonly type: Type;
    // deno-lint-ignore no-explicit-any
    readonly get: (self: T, typeParams: readonly motion.runtime.RuntimeType[]) => any;
}

export class HostStructType<T> extends motion.runtime.Struct {
    #default: (typeParams: readonly motion.runtime.RuntimeType[]) => T;
    #fields = new Map<string, (self: T, typeParams: readonly motion.runtime.RuntimeType[]) => unknown>();
    // deno-lint-ignore no-explicit-any
    #create: (typeParams: readonly motion.runtime.RuntimeType[], fields: Readonly<Partial<Record<string, any>>>) => T;

    override annotations: readonly motion.annotation.Annotation[];
    override typeParams: readonly motion.runtime.TypeParameter[];
    override fields: Readonly<Record<string, motion.runtime.Field>>;

    constructor(options: StructOptions<T>) {
        super();
        const [typeParams, idToTypeParam] = ElementOptions.createTypeParams(options);
        this.annotations = LabelingOptions.toAnnotations(options);
        this.typeParams = typeParams;
        this.fields = Object.fromEntries(
            Object.entries(options.fields).map(([name, { get, type, ...options }]) => {
                this.#fields.set(name, get);
                const annotations = LabelingOptions.toAnnotations(options);
                const fieldType = Type.convert(type, idToTypeParam);
                return [name, { annotations, fieldType }];
            }),
        );
        this.#default = options.default;
        this.#create = options.create;
    }

    override default(typeParams: readonly motion.runtime.RuntimeType[]): T {
        return this.#default(typeParams);
    }

    // deno-lint-ignore no-explicit-any
    override create(typeParams: readonly motion.runtime.RuntimeType[], fields: Readonly<Record<string, any>>): T {
        return this.#create(typeParams, fields);
    }

    // deno-lint-ignore no-explicit-any
    override get(typeParams: readonly motion.runtime.RuntimeType[], struct: any, field: string): unknown {
        return this.#fields.get(field)!(struct, typeParams);
    }
}

export interface VariantOptions<T> extends TypeOptions<T> {
    readonly variants: Readonly<Record<string, VariantOptionOptions<T>>>;
}

export interface VariantOptionOptions<T> extends LabelingOptions {
    readonly dataType: Type | null;
    readonly match: (self: T, typeParams: readonly motion.runtime.RuntimeType[]) => MatchResult;
    // deno-lint-ignore no-explicit-any
    readonly create: (typeParams: readonly motion.runtime.RuntimeType[], data: any) => T;
}

export type MatchResult = {
    readonly matched: false;
} | {
    readonly matched: true;
    readonly data?: unknown;
};

export const MatchResult: {
    readonly notMatched: MatchResult;
    readonly matched: MatchResult;
    readonly matchedWith: (data: unknown) => MatchResult;
} = {
    notMatched: { matched: false },
    matched: { matched: true },
    matchedWith: (data) => ({ matched: true, data }),
};

export class HostVariantType<T> extends motion.runtime.Variant {
    #default: (typeParams: readonly motion.runtime.RuntimeType[]) => T;
    #options: Map<string, VariantOptionOptions<T>>;

    override annotations: readonly motion.annotation.Annotation[];
    override typeParams: readonly motion.runtime.TypeParameter[];
    override options: Readonly<Record<string, motion.runtime.Option>>;

    constructor(options: VariantOptions<T>) {
        super();
        const [typeParams, idToTypeParam] = ElementOptions.createTypeParams(options);
        this.annotations = LabelingOptions.toAnnotations(options);
        this.typeParams = typeParams;
        this.options = Object.fromEntries(
            Object.entries(options.variants).map(([name, { dataType, ...options }]) => [name, {
                annotations: LabelingOptions.toAnnotations(options),
                dataType: dataType == null ? null : Type.convert(dataType, idToTypeParam),
            }]),
        );
        this.#default = options.default;
        this.#options = new Map(Object.entries(options.variants));
    }

    override default(typeParams: readonly motion.runtime.RuntimeType[]): T {
        return this.#default(typeParams);
    }

    override create(typeParams: readonly motion.runtime.RuntimeType[], option: string, data?: unknown): T {
        const opt = this.#options.get(option);
        if (opt == null) throw new Error(`No option '${option}'`);
        return opt.create(typeParams, data);
    }

    override match(typeParams: readonly motion.runtime.RuntimeType[], value: T): motion.runtime.MatchResult {
        for (const [option, { match }] of this.#options) {
            const result = match(value, typeParams);
            if (result.matched) return { option, data: result.data };
        }

        throw new Error(`No option matched the value ${value} (variant must match any given values)`);
    }
}

export interface ComponentOptions extends ElementOptions {
    readonly parameters?: Readonly<Record<string, ParameterOptions>>;
    readonly slots?: Readonly<Record<string, SlotOptions>>;
    readonly render: (options: {
        readonly context: motion.context.ContextMap;
        readonly typeParams: readonly motion.runtime.RuntimeType[];
        // deno-lint-ignore no-explicit-any
        readonly parameters: Readonly<Partial<Record<string, (...inputs: any[]) => any>>>;
        readonly slots: Readonly<
            Partial<
                Record<
                    string,
                    // deno-lint-ignore no-explicit-any
                    (context: motion.context.ContextMap, ...inputs: any[]) => PromiseLike<void> | void
                >
            >
        >;
    }) => Promise<void> | void;
}

export interface ParameterOptions extends LabelingOptions {
    readonly inputs?: readonly InputOptions[];
    readonly output: Type;
}

export interface SlotOptions extends LabelingOptions {
    readonly inputs?: readonly InputOptions[];
}

export class HostComponent extends motion.runtime.Component {
    #render: ComponentOptions["render"];

    override annotations: readonly motion.annotation.Annotation[];
    override typeParams: readonly motion.runtime.TypeParameter[];
    override parameters: Readonly<Record<string, motion.runtime.Parameter>>;
    override slots: Readonly<Record<string, motion.runtime.Slot>>;

    constructor(options: ComponentOptions) {
        super();
        const [typeParams, idToTypeParam] = ElementOptions.createTypeParams(options);
        this.annotations = LabelingOptions.toAnnotations(options);
        this.typeParams = typeParams;
        this.parameters = Object.fromEntries(
            Object.entries(options.parameters ?? {}).map(([name, { inputs, output, ...options }]) => [name, {
                annotations: LabelingOptions.toAnnotations(options),
                inputs: (inputs ?? []).map(({ type, ...options }) => ({
                    annotations: LabelingOptions.toAnnotations(options),
                    inputType: Type.convert(type, idToTypeParam),
                })),
                outputType: Type.convert(output, idToTypeParam),
            }]),
        );
        this.slots = Object.fromEntries(
            Object.entries(options.slots ?? {}).map(([name, { inputs, ...options }]) => [name, {
                annotations: LabelingOptions.toAnnotations(options),
                inputs: (inputs ?? []).map(({ type, ...options }) => ({
                    annotations: LabelingOptions.toAnnotations(options),
                    inputType: Type.convert(type, idToTypeParam),
                })),
            }]),
        );
        this.#render = options.render;
    }

    override async render(
        typeParams: readonly motion.runtime.RuntimeType[],
        context: motion.context.ContextMap,
        // deno-lint-ignore no-explicit-any
        parameters: Readonly<Partial<Record<string, (...inputs: any[]) => any>>>,
        slots: Readonly<
            // deno-lint-ignore no-explicit-any
            Partial<Record<string, (context: motion.context.ContextMap, ...inputs: any[]) => PromiseLike<void> | void>>
        >,
    ): Promise<void> {
        await this.#render({
            context,
            typeParams,
            parameters,
            slots,
        });
    }
}
