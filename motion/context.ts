import type * as env from "./env.ts";

export class ContextMap {
    // deno-lint-ignore ban-types
    private constructor(private readonly map: Map<Function, Context>) {}

    static readonly EMPTY: ContextMap = new ContextMap(new Map());

    static builder(): ContextMapBuilder {
        return this.EMPTY.builder();
    }

    builder(): ContextMapBuilder {
        const content = new Map(this == ContextMap.EMPTY ? undefined : this.map);

        const builder: ContextMapBuilder = {
            with: (context) => {
                content.set(context.constructor, context);
                return builder;
            },

            without: (type) => {
                content.delete(type);
                return builder;
            },

            build: () => new ContextMap(content),
        };

        return builder;
    }

    // deno-lint-ignore no-explicit-any
    get<T extends Context>(type: { new (...args: any[]): T }): T | null {
        return this.map.get(type) as T ?? null;
    }

    // deno-lint-ignore no-explicit-any
    getMultiple<T extends Context[]>(...types: { [Index in keyof T]: { new (...args: any[]): T[Index] } }): T | null {
        const result = types.map((type) => this.get(type));
        if (result.some((c) => c == null)) return null;
        return result as T;
    }

    with<T extends Context>(context: T): ContextMap {
        if (this.map.get(context.constructor) == context) return this;
        return this.builder().with(context).build();
    }

    // deno-lint-ignore no-explicit-any
    without<T>(type: { new (...args: any[]): T }): ContextMap {
        if (!this.map.has(type)) return this;
        return this.builder().without(type).build();
    }
}

export interface ContextMapBuilder {
    /**
     * Add context to this builder
     *
     * @param context Context
     */
    with<T extends Context>(context: T): ContextMapBuilder;

    /**
     * Remove context of given type from this builder
     *
     * @param type Context type
     */
    // deno-lint-ignore ban-types
    without(type: Function): ContextMapBuilder;

    /**
     * Build the immutable context map
     */
    build(): ContextMap;
}

/**
 * Base class for context
 *
 * Contexts are expected to be created for each frame and they should not be reused across frames (we have environment
 * for that).
 */
export abstract class Context {}

/**
 * Global context
 *
 * Global context provide the global environment and additional information about current frame (which is none at this
 * moment).
 */
export class GlobalContext extends Context {
    constructor(
        public readonly env: env.GlobalEnv,
    ) {
        super();
    }
}

/**
 * Graphics context
 *
 * Graphics context provide the graphics environment (which persists across frames) and command encoder for encoding GPU
 * commands to render for current frame.
 */
export class GraphicsContext extends Context {
    constructor(
        public readonly env: env.GraphicsEnv,
        public readonly encoder: GPUCommandEncoder,
        public readonly target: GPUTexture,
    ) {
        super();
    }

    withTarget(target: GPUTexture): GraphicsContext {
        return new GraphicsContext(this.env, this.encoder, target);
    }
}
