import * as annotations from "./annotation.ts";
import type * as context from "./context.ts";

/**
 * Element in a module
 *
 * The following element types should be supported by all libraries relying on the engine:
 *
 * - {@link TypeDecl}
 * - {@link Function}
 * - {@link Component}
 *
 * There could be potentially more element types (especially if they are embedder-specific element types like constant
 * value for example), but the general guide is to only check if the element matches the needed type.
 */
export abstract class Element<T = unknown> {
    abstract readonly info: T;
}

export abstract class TypeDecl extends Element<TypeDeclInfo> {}
export abstract class Function extends Element<FunctionInfo> {}
export abstract class Component extends Element<ComponentInfo> {}

class NativeTypeDecl extends TypeDecl {
    #cached: TypeDeclInfo | null = null;
    #query: () => TypeDeclInfo;

    constructor(query: () => TypeDeclInfo) {
        super();
        this.#query = query;
    }

    override get info(): TypeDeclInfo {
        if (this.#cached == null) this.#cached = this.#query();
        return this.#cached;
    }
}

class NativeFunction extends Function {
    #cached: FunctionInfo | null = null;
    #query: () => FunctionInfo;

    constructor(query: () => FunctionInfo) {
        super();
        this.#query = query;
    }

    override get info(): FunctionInfo {
        if (this.#cached == null) this.#cached = this.#query();
        return this.#cached;
    }
}

export type TypeDeclInfo =
    | NativeTypeDeclInfo
    | StructTypeDeclInfo
    | VariantTypeDeclInfo;

/**
 * Function declaration
 */
export interface FunctionInfo {
    readonly annotations: readonly annotations.Annotation[];
    readonly typeParams: readonly TypeParameterInfo[];
    readonly inputs: readonly FunctionInputInfo[];
    readonly returnType: Type;
    // deno-lint-ignore no-explicit-any
    readonly apply: (typeParams: readonly QualifiedType[], ...inputs: any[]) => unknown;
}

export interface FunctionInputInfo {
    readonly annotations: readonly annotations.Annotation[];
    readonly type: Type;
}

interface BaseTypeDeclInfo<F extends string> {
    readonly typeParams: readonly TypeParameterInfo[];
    readonly annotations: readonly annotations.Annotation[];
    readonly family: F;
    readonly default: (typeParams: readonly QualifiedType[]) => unknown;
    readonly methods: Readonly<Record<string, MethodInfo>>;
}

export interface MethodInfo {
    readonly annotations: readonly annotations.Annotation[];
    readonly typeParams: readonly TypeParameterInfo[];
    readonly inputs: readonly FunctionInputInfo[];
    readonly returnType: Type;

    /**
     * Apply the method on instance
     *
     * @param typeParams Input type parameters
     * @param self Instance (a.k.a `this`) value
     * @param inputs Input parameters
     * @returns Result
     */
    // deno-lint-ignore no-explicit-any
    readonly apply: (typeParams: readonly QualifiedType[], self: any, ...inputs: any[]) => unknown;
}

/**
 * Native type declaration
 *
 * Native types are created by embedder environment. The values must be created by using constant, `default`, field of
 * a struct or function/method call expressions.
 */
export interface NativeTypeDeclInfo extends BaseTypeDeclInfo<"native"> {}

/**
 * Struct type declaration
 */
export interface StructTypeDeclInfo extends BaseTypeDeclInfo<"struct"> {
    readonly fields: Readonly<Record<string, StructFieldInfo>>;
    readonly create: (typeParams: readonly QualifiedType[], fields: Record<string, unknown>) => unknown;
}

export interface StructFieldInfo {
    readonly annotations: readonly annotations.Annotation[];
    readonly type: Type;
    readonly get: (typeParams: readonly QualifiedType[], self: unknown) => unknown;
}

/**
 * Variant type declaration
 */
export interface VariantTypeDeclInfo extends BaseTypeDeclInfo<"variant"> {
    readonly options: Readonly<Record<string, VariantOptionInfo>>;
}

export interface VariantOptionInfo {
    readonly annotations: readonly annotations.Annotation[];
    readonly type: Type | null;
    readonly match: (typeParams: readonly QualifiedType[], self: unknown) => MatchResult;
    readonly create: (typeParams: readonly QualifiedType[], data: unknown) => unknown;
}

export type MatchResult =
    | { readonly matched: false }
    | { readonly matched: true; readonly data: unknown };

/**
 * Component declaration
 */
export interface ComponentInfo {
    readonly annotations: readonly annotations.Annotation[];
    readonly typeParams: readonly TypeParameterInfo[];
    readonly parameters: Readonly<Record<string, ParameterInfo>>;
    readonly slots: Readonly<Record<string, SlotInfo>>;
    readonly eval: (options: ComponentEvalOptions) => Promise<void>;
}

export interface ParameterInfo {
    readonly annotations: readonly annotations.Annotation[];
    readonly inputs: readonly FunctionInputInfo[];
    readonly returnType: Type;
}

export interface SlotInfo {
    readonly annotations: readonly annotations.Annotation[];
    readonly inputs: readonly FunctionInputInfo[];
}

export interface ComponentEvalOptions {
    /**
     * Context to pass to component
     */
    readonly context: context.ContextMap;

    /**
     * List of input type parameters
     *
     * If the component declare type parameters, this option field must be present.
     */
    readonly typeParams?: readonly QualifiedType[];

    /**
     * Input parameters for the component
     */
    readonly parameters?: Readonly<Record<string, (...inputs: unknown[]) => unknown>>;

    /**
     * Slots to pass to component
     *
     * When passing a slot to component, the context provided in callback function should be used instead of the context
     * passing to {@link ComponentInfo.eval}. For example:
     *
     * ```typescript
     * const myScene: Component;
     * const myInnerScene: Component;
     *
     * await myScene.info.eval({
     *     context: ContextMap
     *         .builder()
     *         .with(GraphicsContext, new GraphicsContext())
     *         .build(),
     *     slots: {
     *         children: async (context) => {
     *             await myInnerScene.info.eval({ context });
     *         }
     *     }
     * });
     * ```
     */
    readonly slots?: Readonly<
        Record<string, (context: context.ContextMap, ...inputs: unknown[]) => Promise<void> | void>
    >;
}

/**
 * Type parameter information
 */
export interface TypeParameterInfo {
    readonly annotations: readonly annotations.Annotation[];
}

/**
 * "Parameterizable" type for describing a type in info
 */
export type Type =
    | FreshType
    | ParameterizedType;

export interface FreshType {
    readonly kind: "fresh";
    readonly decl: TypeDecl;
    readonly typeParams: readonly Type[];
}

export interface ParameterizedType {
    readonly kind: "parameterized";
    readonly parameterOrdinal: number;
}

/**
 * Fully qualified version of {@link Type}
 */
export interface QualifiedType {
    readonly decl: TypeDecl;
    readonly typeParams: readonly QualifiedType[];
}

/**
 * Check whether 2 types are the same
 *
 * This should only be used when both types are inside the same type parameter context (a.k.a shares the same type
 * parameter table), or when the type parameter table of one type inheriting another (e.g. A is inside type-level
 * context and B is inside method-level context, which also inherits type-level type parameter table).
 *
 * @param a Type A
 * @param b Type B
 * @returns Whether 2 types are the same
 */
export function typeEquals(a: Type, b: Type): boolean {
    if (a == b) return true;
    if (a.kind != b.kind) return false;

    switch (a.kind) {
        case "fresh": {
            const bb = b as FreshType;
            return a.decl == bb.decl &&
                a.typeParams.length == bb.typeParams.length &&
                a.typeParams.every((type, i) => typeEquals(type, bb.typeParams[i]));
        }

        case "parameterized": {
            return a.parameterOrdinal == (b as ParameterizedType).parameterOrdinal;
        }
    }
}

/**
 * Core module content
 *
 * The core module typically have the `builtin:core` module identifier (though it is still up to embedder to define).
 */
export const coreModule: {
    readonly number: TypeDecl;
    readonly boolean: TypeDecl;
    readonly string: TypeDecl;
    readonly Array: TypeDecl;
    readonly if: Function;
} = {
    number: new NativeTypeDecl(() => ({
        annotations: [
            annotations.annotate("editor", {
                name: "Number",
                description: "Decimal value",
            }),
        ],
        typeParams: [],
        family: "native",
        default: () => 0,
        methods: {
            add: {
                annotations: [
                    annotations.annotate("editor", {
                        name: "Add",
                        iocn: "add",
                        description: "Add 2 decimals together",
                    }),
                ],
                typeParams: [],
                inputs: [
                    {
                        annotations: [
                            annotations.annotate("editor", {
                                name: "Other",
                                description: "The other value to add",
                            }),
                        ],
                        type: { kind: "fresh", decl: coreModule.number, typeParams: [] },
                    },
                ],
                returnType: { kind: "fresh", decl: coreModule.number, typeParams: [] },
                apply: (_, lhs: number, rhs: number) => lhs + rhs,
            },
        },
    })),

    boolean: new NativeTypeDecl(() => ({
        annotations: [
            annotations.annotate("editor", {
                name: "Boolean",
                description: "Represent either true or false state, typically viewed as checkbox",
            }),
        ],
        typeParams: [],
        family: "native",
        default: () => false,
        methods: {},
    })),

    string: new NativeTypeDecl(() => ({
        annotations: [
            annotations.annotate("editor", {
                name: "Text",
                description: "A sequence of characters",
            }),
        ],
        typeParams: [],
        family: "native",
        default: () => "",
        methods: {},
    })),

    Array: new NativeTypeDecl(() => ({
        annotations: [
            annotations.annotate("editor", {
                name: "List",
                description: "A sequence of values",
            }),
        ],
        typeParams: [
            {
                annotations: [
                    annotations.annotate("editor", {
                        name: "Element",
                        description: "Type of all values in the list",
                    }),
                ],
            },
        ],
        family: "native",
        default: () => [],
        methods: {},
    })),

    if: new NativeFunction(() => ({
        annotations: [
            annotations.annotate("editor", {
                name: "Conditional",
                description: "Return value based on condition",
            }),
        ],
        typeParams: [
            {
                annotations: [
                    annotations.annotate("editor", {
                        name: "Value",
                        description: "Type of value that this function evalutes to",
                    }),
                ],
            },
        ],
        inputs: [
            {
                annotations: [
                    annotations.annotate("editor", {
                        name: "Condition",
                        description: "Condition to test",
                    }),
                ],
                type: { kind: "fresh", decl: coreModule.boolean, typeParams: [] },
            },
            {
                annotations: [
                    annotations.annotate("editor", {
                        name: "True",
                        description: "Value to return if condition is true",
                    }),
                ],
                type: { kind: "parameterized", parameterOrdinal: 0 },
            },
            {
                annotations: [
                    annotations.annotate("editor", {
                        name: "False",
                        description: "Value to return if condition is false",
                    }),
                ],
                type: { kind: "parameterized", parameterOrdinal: 0 },
            },
        ],
        returnType: { kind: "parameterized", parameterOrdinal: 0 },
        apply: (_, condition, ifTrue, ifFalse) => condition ? ifTrue : ifFalse,
    })),
};
