const doNothing = () => {};

/**
 * Cache implementation for caching values
 *
 * Usually used for caching things like render pipelines, font data and anything that could potentially expensive to
 * compute, with an optional retention rule to automatically invalidate cached value after specified number of cycles
 * (frames).
 *
 * For render pipelines, you generally want the one with user-generated shader to live for a short amount of time (about
 * 30 to 60 frames).
 */
export class Cache implements Disposable {
    #entries = new Map<unknown, CacheEntry>();

    /**
     * Get cached value or create new one if not cached
     */
    get<T>(options: CacheOptions<T>): T {
        let entry = this.#entries.get(options.key);

        if (entry == null) {
            this.#entries.set(
                options.key,
                entry = {
                    value: options.factory(),
                    life: options.retention ?? null,
                    cycle: options.cycle ?? doNothing,
                    destroy: options.destroy ?? doNothing,
                },
            );
        }

        entry.life = options.retention ?? null;
        entry.cycle = options.cycle ?? entry.cycle;
        entry.destroy = options.destroy ?? entry.destroy;
        return entry.value;
    }

    /**
     * Subcaching from this cache
     */
    subcache(options: SubcacheOptions): Cache {
        return this.get({
            key: options.key,
            retention: options.retention,
            factory: () => new Cache(),
            cycle: (cache) => cache.beginCycle(),
            destroy: (cache) => cache.invalidateAll(),
        });
    }

    /**
     * Begin a new cycle
     *
     * Usually called before starting a new frame.
     */
    beginCycle(): void {
        this.#entries.forEach((entry, key) => {
            if (entry.life == null || entry.life-- != 0) {
                entry.cycle(entry.value);
                return;
            }

            entry.destroy(entry.value);
            this.#entries.delete(key);
        });
    }

    /**
     * Invalidate all cached entries
     */
    invalidateAll(): void {
        if (this.#entries.size == 0) return;
        this.#entries.forEach(({ value, destroy }) => destroy(value));
        this.#entries = new Map();
    }

    [Symbol.dispose](): void {
        this.invalidateAll();
    }
}

interface CacheEntry {
    // deno-lint-ignore no-explicit-any
    readonly value: any;
    life: number | null;
    // deno-lint-ignore no-explicit-any
    cycle: (value: any) => void;
    // deno-lint-ignore no-explicit-any
    destroy: (value: any) => void;
}

export interface CacheOptions<T> {
    /**
     * Cache key
     *
     * Each key uniquely identifying the cached object.
     */
    readonly key: unknown;

    /**
     * Retention rule
     *
     * This option specify the number of cycles that the value hasn't been accessed before the cached value get
     * invalidated. If the value is `null` or not prevent, the cache will remember the value until the end of cache's
     * lifecycle.
     */
    readonly retention?: number | null;

    /**
     * Factory function
     *
     * Called to produce a new value if the cache key hasn't been associated with a cached value yet, or when the cache
     * invalidated the key.
     */
    readonly factory: () => T;

    /**
     * Cycle callback function
     *
     * Called when the value survived in the next cycle.
     */
    readonly cycle?: (value: T) => void;

    /**
     * Destroy callback function
     *
     * Called when the value is about to be invalidated by the cache.
     */
    readonly destroy?: (value: T) => void;
}

/**
 * Subcache options
 */
export interface SubcacheOptions {
    readonly key: unknown;
    readonly retention?: number | null;
}
