/**
 * `Map<K, V>` but with key mapper and no setter
 *
 * Whole purpose is to cache GPU pipelines, and create new one when needed.
 *
 * ```
 * const pipelineCache: Cached<{ format: GPUTextureFormat; blend: GPUBlendState; }, GPURenderPipeline>;
 * const encoder: GPUCommandEncoder;
 *
 * const pass = encoder.beginRenderPass(renderPassDesc);
 * pass.setPipeline(pipelineCache.get({ format: "rgba8unorm", blend: SOURCE_OVER }));
 * pass.draw(4, 1, 0, 0);
 * pass.end();
 * ```
 */
export class Cached<K, V> {
    #factory: (key: K) => V;
    #deriveKey: (key: K) => unknown;
    #cache = new Map<unknown, V>();

    constructor(options: CachedOptions<K, V>) {
        const { factory, deriveKey } = options;
        this.#factory = factory;
        this.#deriveKey = deriveKey ?? ((x) => x);
    }

    get(key: K): V {
        return this.#cache.getOrInsertComputed(this.#deriveKey(key), () => this.#factory(key));
    }
}

export interface CachedOptions<K, V> {
    readonly factory: (key: K) => V;
    readonly deriveKey?: (key: K) => unknown;
}
