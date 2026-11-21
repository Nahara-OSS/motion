import * as annotation from "./annotation.ts";
import * as runtime from "./runtime.ts";

export const number: runtime.TypeDecl = new (class extends runtime.TypeDecl {
    override annotations: readonly annotation.Annotation[] = [
        annotation.annotate("editor", {
            name: "Number",
            description: "A decimal number",
        }),
    ];

    override typeParams: readonly runtime.TypeParameter[] = [];

    override default() {
        return 0;
    }
})();

export const boolean: runtime.TypeDecl = new (class extends runtime.TypeDecl {
    override annotations: readonly annotation.Annotation[] = [
        annotation.annotate("editor", {
            name: "Boolean",
            description: "True or false value",
        }),
    ];

    override typeParams: readonly runtime.TypeParameter[] = [];

    override default() {
        return false;
    }
})();

export const string: runtime.TypeDecl = new (class extends runtime.TypeDecl {
    override annotations: readonly annotation.Annotation[] = [
        annotation.annotate("editor", {
            name: "Text",
            description: "A sequence of characters",
        }),
    ];

    override typeParams: readonly runtime.TypeParameter[] = [];

    override default() {
        return "";
    }
})();

/**
 * Represent a sequence of values
 *
 * - **Guest type**: `array<T>`
 * - **Host type**: `unknown[]`
 */
export const array: runtime.TypeDecl = new (class extends runtime.TypeDecl {
    override annotations: readonly annotation.Annotation[] = [
        annotation.annotate("editor", {
            name: "List",
            description: "A sequence of values",
        }),
    ];

    override typeParams: readonly runtime.TypeParameter[] = [
        new runtime.TypeParameter([
            annotation.annotate("editor", {
                name: "Element",
                description: "Type of each value in the list",
            }),
        ]),
    ];

    override default() {
        return [];
    }
})();

/**
 * Represent a reference to asset
 *
 * - **Guest type**: `asset`
 * - **Host type**: `Blob | null`
 */
export const asset: runtime.TypeDecl = new (class extends runtime.TypeDecl {
    override annotations: readonly annotation.Annotation[] = [
        annotation.annotate("editor", {
            name: "Asset reference",
            description: "A reference to asset",
        }),
    ];

    override typeParams: readonly runtime.TypeParameter[] = [];

    override default() {
        return null;
    }
})();
