/**
 * Annotation model interfaces
 *
 * Annotations are used for storing tooling data. These annotations are stored inside modules, but have no effect to the
 * engine's rendering pipeline.
 *
 * @module
 */

/**
 * Represent an annotation
 *
 * Annotations are used for storing tooling-only data inside modules. They have no effect to the engine's rendering
 * pipeline, but tools like the editor or puppeteer would use these annotations to provide inputs during runtime, such
 * as turning parameter into time or puppet control values when applied on component parameters.
 *
 * Annotations can be applied before these parts:
 *
 * - Type declaration (struct or variant declaration);
 * - Type parameter declaration;
 * - Struct field declaration;
 * - Variant option declaration;
 * - Function;
 * - Component;
 * - Component parameter;
 * - Component objects.
 */
export interface Annotation {
    readonly name: string;
    readonly entries: Readonly<Record<string, AnnotationElement>>;
}

export type AnnotationElement =
    | PrimitiveAnnotationElement<"number", number>
    | PrimitiveAnnotationElement<"boolean", boolean>
    | PrimitiveAnnotationElement<"string", string>
    | ListAnnotationElement
    | DictionaryAnnotationElement;

export interface PrimitiveAnnotationElement<T extends string, V> {
    readonly kind: T;
    readonly value: V;
}

export interface ListAnnotationElement {
    readonly kind: "list";
    readonly values: readonly AnnotationElement[];
}

export interface DictionaryAnnotationElement {
    readonly kind: "dictionary";
    readonly values: Readonly<Record<string, AnnotationElement>>;
}

export interface AnnotationX {
    readonly name: string;
    readonly entries: Readonly<Record<string, AnnotationXElement>>;
}

export type AnnotationXElement =
    | number
    | boolean
    | string
    | readonly AnnotationXElement[]
    | { readonly [x in string]: AnnotationXElement };

export function annotate(name: string, entries: Readonly<Record<string, AnnotationXElement>>): Annotation {
    return {
        name,
        entries: Object.fromEntries(Object.entries(entries).map(([name, e]) => [name, convertElement(e)] as const)),
    };
}

function convertElement(e: AnnotationXElement): AnnotationElement {
    if (typeof e == "number") return { kind: "number", value: e };
    if (typeof e == "string") return { kind: "string", value: e };
    if (typeof e == "boolean") return { kind: "boolean", value: e };
    if (e instanceof Array) return { kind: "list", values: e.map(convertElement) };

    return {
        kind: "dictionary",
        values: Object.fromEntries(Object.entries(e).map(([name, e]) => [name, convertElement(e)] as const)),
    };
}
