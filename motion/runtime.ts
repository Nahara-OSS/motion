import type * as annotations from "./annotation.ts";
import type * as context from "./context.ts";

export abstract class Element {
    /**
     * Name representing the type of element
     *
     * This information is for debugging only.
     */
    abstract readonly elementTypeName: string;

    /**
     * Annotations on this module element
     */
    abstract readonly annotations: readonly annotations.Annotation[];
}

/**
 * Asset element
 */
export abstract class Asset extends Element {
    override elementTypeName: string = "asset";

    /**
     * Asset content in binary
     *
     * It is recommended to use the blob value in this field as key for cache-related operations, such as caching
     * decoded images for example.
     */
    abstract readonly data: Blob;
}

/**
 * Type declaration
 *
 * Initially, there are 3 families of types:
 *
 * - Native type, which extends {@link TypeDecl} directly;
 * - {@link Struct} for types that are struct-like;
 * - {@link Variant} for types that are variant-like.
 */
export abstract class TypeDecl extends Element {
    #cachedType: Type | null = null;

    override elementTypeName: string = "type";

    /**
     * Type parameter declarations
     */
    abstract readonly typeParams: readonly TypeParameter[];

    /**
     * Get default value of this type
     *
     * @param typeParams Input type parameters (must match declared type parameters)
     */
    // deno-lint-ignore no-explicit-any
    abstract default(typeParams: readonly RuntimeType[]): any;

    asType(typeParams: readonly Type[] = []): Type {
        if (typeParams.length == 0) {
            if (this.#cachedType == null) this.#cachedType = new ConcreteType(this, []);
            return this.#cachedType;
        }

        return new ConcreteType(this, typeParams);
    }
}

/**
 * Struct declaration
 */
export abstract class Struct extends TypeDecl {
    override elementTypeName: string = "struct";

    /**
     * All fields that this struct holds
     */
    abstract readonly fields: Readonly<Record<string, Field>>;

    /**
     * Get value in a field from a struct
     *
     * @param typeParams Input type parameters (must match declared type parameters)
     * @param struct Struct value
     * @param field Field name
     */
    // deno-lint-ignore no-explicit-any
    abstract get(typeParams: readonly RuntimeType[], struct: any, field: string): any;

    /**
     * Create a new struct
     *
     * @param typeParams Input type parameters (must match declared type parameters)
     * @param fields Input fields
     */
    // deno-lint-ignore no-explicit-any
    abstract create(typeParams: readonly RuntimeType[], fields: Readonly<Record<string, any>>): any;
}

export interface Field {
    readonly annotations: readonly annotations.Annotation[];
    readonly fieldType: Type;
}

/**
 * Variant declaration
 */
export abstract class Variant extends TypeDecl {
    override elementTypeName: string = "variant";

    /**
     * All options that this variant supports
     */
    abstract readonly options: Readonly<Record<string, Option>>;

    /**
     * Match an option from variant value
     *
     * @param typeParams Input type parameters (must match declared type parameters)
     * @param value Variant value
     */
    // deno-lint-ignore no-explicit-any
    abstract match(typeParams: readonly RuntimeType[], value: any): MatchResult;

    /**
     * Create a new variant
     *
     * @param typeParams Input type parameters (must match declared type parameters)
     * @param option Option
     * @param data Option data
     */
    // deno-lint-ignore no-explicit-any
    abstract create(typeParams: readonly RuntimeType[], option: string, data?: any): any;
}

export interface Option {
    readonly annotations: readonly annotations.Annotation[];
    readonly dataType: Type | null;
}

export interface MatchResult {
    readonly option: string;
    // deno-lint-ignore no-explicit-any
    readonly data: any;
}

export class TypeParameter {
    constructor(public readonly annotations: readonly annotations.Annotation[]) {}
}

export type Type =
    | ConcreteType
    | TypeParameter;

/**
 * Build time type information
 */
export class ConcreteType {
    constructor(
        public readonly declaration: TypeDecl,
        public readonly typeParams: readonly Type[],
    ) {}
}

/**
 * Runtime type information
 */
export class RuntimeType {
    constructor(
        public readonly declaration: TypeDecl,
        public readonly typeParams: readonly RuntimeType[],
    ) {}

    // deno-lint-ignore no-explicit-any
    default(): any {
        this.declaration.default(this.typeParams);
    }
}

/**
 * Function declaration
 */
export abstract class Function extends Element {
    override elementTypeName: string = "function";

    /**
     * Type parameter declarations
     */
    abstract readonly typeParams: readonly TypeParameter[];

    /**
     * Function input info
     */
    abstract readonly inputs: readonly Input[];

    /**
     * Function output type
     */
    abstract readonly outputType: Type;

    /**
     * Invoke the function
     *
     * @param typeParams Input type parameters (must match declared type parameters)
     * @param inputs Input for this function
     */
    // deno-lint-ignore no-explicit-any
    abstract invoke(typeParams: readonly RuntimeType[], ...inputs: any[]): any;
}

export interface Input {
    readonly annotations: readonly annotations.Annotation[];
    readonly inputType: Type;
}

/**
 * Component declaration
 */
export abstract class Component extends Element {
    override elementTypeName: string = "component";

    /**
     * Type parameter declarations
     */
    abstract readonly typeParams: readonly TypeParameter[];

    /**
     * Component parameters
     */
    abstract readonly parameters: Readonly<Record<string, Parameter>>;

    /**
     * Component slots
     */
    abstract readonly slots: Readonly<Record<string, Slot>>;

    /**
     * Render the component
     *
     * @param typeParams Input type parameters (must match declared type parameters)
     * @param context Context to render into
     * @param parameters Input parameters
     * @param slots Input slots
     */
    abstract render(
        typeParams: readonly RuntimeType[],
        context: context.ContextMap,
        // deno-lint-ignore no-explicit-any
        parameters: Readonly<Partial<Record<string, (...inputs: any[]) => any>>>,
        slots: Readonly<
            // deno-lint-ignore no-explicit-any
            Partial<Record<string, (context: context.ContextMap, ...inputs: any[]) => PromiseLike<void> | void>>
        >,
    ): Promise<void>;
}

export interface Parameter {
    readonly annotations: readonly annotations.Annotation[];
    readonly inputs: readonly Input[];
    readonly outputType: Type;
}

export interface Slot {
    readonly annotations: readonly annotations.Annotation[];
    readonly inputs: readonly Input[];
}
