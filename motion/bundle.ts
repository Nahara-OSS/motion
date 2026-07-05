/**
 * Nahara's Motion bundle system.
 *
 * The bundle system is a method for packaging object types, menu items, resource providers, factory resources and
 * dependencies into a single, reusable bundle object.
 *
 * @module
 */

import type { ObjectType } from "./object.ts";
import type { Value } from "./value.ts";

export interface Bundle {
    readonly identifier: symbol;
    readonly includes: ReadonlySet<symbol>;
    readonly objectTypes: ReadonlyMap<string, ObjectType<unknown>>;
    readonly globals: ReadonlyMap<string, Value<unknown>>;
}

/**
 * Bundle builder.
 *
 * All bundles must be created using this bundle builder. `build()` must be used to package as `Bundle` when exporting
 * in the module.
 *
 * ```typescript
 * import { Mesh2D } from "./mesh2d.ts";
 *
 * export const bundle: Bundle = new BundleBuilder()
 *     .objectType(Mesh2D)
 *     .build();
 * ```
 */
export class BundleBuilder {
    #identifier = Symbol();
    #includedBundles = new Set<symbol>();
    #objectTypes = new Map<string, ObjectType<unknown>>();
    #globals = new Map<string, Value<unknown>>();

    include(bundle: Bundle): this {
        if (this.#includedBundles.has(bundle.identifier)) return this;
        this.#includedBundles.add(bundle.identifier);
        for (const identifier of bundle.includes) this.#includedBundles.add(identifier);
        for (const [id, type] of bundle.objectTypes) this.#objectTypes.set(id, type);
        for (const [id, value] of bundle.globals) this.#globals.set(id, value);
        return this;
    }

    /**
     * Add object type to builder.
     *
     * @param type Object type
     * @returns Builder for chaining
     */
    objectType<T>(type: ObjectType<T>): this {
        this.#objectTypes.set(type.typeId, type);
        return this;
    }

    /**
     * Add global variable to builder.
     *
     * The global variable is accessible to all expression contexts.
     *
     * @param name Global variable name
     * @param value Global variable value
     * @returns Builder for chaining
     */
    global<T>(name: string, value: Value<T>): this {
        this.#globals.set(name, value as Value<unknown>);
        return this;
    }

    build(): Bundle {
        return {
            identifier: this.#identifier,
            includes: this.#includedBundles,
            objectTypes: this.#objectTypes,
            globals: this.#globals,
        };
    }
}
