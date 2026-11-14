import type * as graphics from "./graphics.ts";
import type * as math from "./math.ts";

export class ContextMap {
    // deno-lint-ignore no-explicit-any
    private constructor(private readonly map: Map<{ new (...args: any[]): unknown }, unknown>) {}

    static readonly EMPTY: ContextMap = new ContextMap(new Map());

    static builder(): ContextMapBuilder {
        return this.EMPTY.builder();
    }

    builder(): ContextMapBuilder {
        const content = new Map(this == ContextMap.EMPTY ? undefined : this.map);

        const builder: ContextMapBuilder = {
            with: (type, context) => {
                content.set(type, context);
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
    get<T>(type: { new (...args: any[]): T }): T | null {
        return this.map.get(type) as T ?? null;
    }

    // deno-lint-ignore no-explicit-any
    with<T>(type: { new (...args: any[]): T }, context: T): ContextMap {
        if (this.map.get(type) == context) return this;
        return this.builder().with(type, context).build();
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
     * @param type Context type
     * @param context Context
     */
    // deno-lint-ignore no-explicit-any
    with<T>(type: { new (...args: any[]): T }, context: T): ContextMapBuilder;

    /**
     * Remove context of given type from this builder
     *
     * @param type Context type
     */
    // deno-lint-ignore no-explicit-any
    without(type: { new (...args: any[]): unknown }): ContextMapBuilder;

    /**
     * Build the immutable context map
     */
    build(): ContextMap;
}

/**
 * Context for caching values
 */
export class CacheContext implements Disposable {
    #entries: Map<unknown, CacheEntry> = new Map();

    get<T>(options: CacheOptions<T>): T {
        const { key, factory, destroy } = options;
        let entry = this.#entries.get(key);
        if (entry == null) this.#entries.set(key, entry = { value: factory(), destroy });
        return entry.value;
    }

    destroy(): void {
        this.#entries.forEach((e) => e.destroy ? e.destroy(e.value) : void 0);
        this.#entries.clear();
    }

    [Symbol.dispose](): void {
        this.destroy();
    }
}

export interface CacheOptions<T> {
    readonly key: unknown;
    readonly factory: () => T;
    readonly destroy?: (value: T) => void;
}

interface CacheEntry {
    // deno-lint-ignore no-explicit-any
    readonly value: any;
    // deno-lint-ignore no-explicit-any
    readonly destroy?: (value: any) => void;
}

/**
 * Context for hooking into lifecycle of the rendering pipeline
 */
export class LifecycleContext {
    #frameStart = new Set<unknown>();
    #frameEnd = new Map<unknown, () => void>();

    onFrameStart(key: unknown, callback: () => void): void {
        if (this.#frameStart.has(key)) return;
        this.#frameStart.add(key);
        callback();
    }

    onFrameEnd(key: unknown, callback: () => void): void {
        if (this.#frameEnd.has(key)) return;
        this.#frameEnd.set(key, callback);
    }

    endFrame(): void {
        for (const [_key, callback] of this.#frameEnd) callback();
        this.#frameStart.clear();
        this.#frameEnd.clear();
    }
}

/**
 * Context providing graphics environment and command encoder
 *
 * This context is created for every single frame. It is not expected to create multiple graphics context per frame.
 */
export class GraphicsContext {
    constructor(
        public readonly env: graphics.GraphicsEnv,
        public readonly encoder: GPUCommandEncoder,
    ) {}
}

/**
 * Context providing render layer
 *
 * Textures provided from this context can be drawn into. The content of those textures will then be used by parent
 * component to do further processing.
 *
 * It is recommended to use {@link GraphicsEnv.newLayer} to create a new render layer, which also handles texture reuse.
 * When creating a new render layer, most of the time, the format of new color texture matches with the one from parent.
 * In some rare cases where higher color depth is needed, the format may be changed, but all color texture formats must
 * be capable of storing RGBA colors.
 */
export class LayerContext {
    constructor(
        public readonly colorTexture: GPUTexture,
        public readonly depthStencil: GPUTexture,
    ) {}
}

/**
 * Context providing camera information
 *
 * A camera context should only be created for each render layer. Changing camera context while rendering to the same
 * render layer might makes it hard to compose components together.
 */
export class CameraContext {
    constructor(
        /**
         * Projection matrix
         *
         * Transform camera-local coordinates to normalzed device coordinates (also known as clip space). Since Nahara's
         * Motion is a 2D motion graphics engine, the projection matrix always look at XY plane (at Z = 0) and scale the
         * camera coordinates so that each unit in camera space corresponding to a single pixel.
         */
        public readonly projection: math.Matrix4,
        /**
         * View matrix
         *
         * Transform world coordinates to camera-local coordinates (move from world space to camera space).
         */
        public readonly view: math.Matrix4,
    ) {}
}

/**
 * Context providing model transform matrix
 */
export class ModelContext {
    constructor(
        /**
         * Model matrix
         *
         * Transform model-local coordinates to world coordinates.
         */
        public readonly model: math.Matrix4,
    ) {}
}
