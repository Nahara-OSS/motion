/**
 * Pool for holding resources
 *
 * Resources stored in a pool can be reused multiple times in a cycle.
 *
 * ```
 * const pool = new ResourcePool<GPUTexture, { width: number, height: number }>;
 * const handle = pool.borrow({ width: window.width, height: window.height });
 * // do something with handle.resource...
 * handle.release();
 * ```
 *
 * @template R Resource type
 * @template P Input properties to find resource
 */
export class ResourcePool<R, P> implements Disposable {
    #factory: (props: P) => R;
    #destroy: (resource: R) => void;
    #deriveKey: (props: P) => unknown;
    #pool = new Map<unknown, ResourceInfo<R>[]>();
    #destroyed = false;

    readonly retention: number;

    constructor(options: ResourcePoolOptions<R, P>) {
        const { factory, destroy = () => {}, retention = 1, deriveKey = (x) => x } = options;
        this.#factory = factory;
        this.#destroy = destroy;
        this.#deriveKey = deriveKey;
        this.retention = retention;
    }

    /**
     * Start a new cycle
     *
     * Resources that hasn't been used for several cycles (defined in {@link ResourcePoolOptions.retention}) will be
     * destroyed.
     *
     * This method is usually called before the start of new frame, or to be more precise, before the pool is used in
     * new frame.
     */
    cycle(): void {
        for (const [key, subpool] of this.#pool.entries()) {
            this.#pool.set(
                key,
                subpool.filter((info) => {
                    if (info.life <= 0) {
                        this.#destroy(info.resource);
                        return false;
                    } else {
                        info.life--;
                        return true;
                    }
                }),
            );
        }
    }

    /**
     * Borrow resource from this pool
     *
     * If the pool have no resources matching the provided properties, a new resource will be allocated and tracked by
     * the pool, otherwise reuse the existing resource. Therefore, it is important to "clear" the resource (e.g. perform
     * clear render pass) before using it for anything.
     *
     * Borrowed resource must be released, either with {@link Borrowed.release} or by using `using` keyword, otherwise
     * it will be leaked.
     *
     * @param props Resource properties
     * @returns Borrowed resource handle
     */
    borrow(props: P): Borrowed<R> {
        if (this.#destroyed) throw new Error("Pool is destroyed");

        const resource = this.#borrow(props);
        let borrowed = true;

        const release = () => {
            if (!borrowed) return;
            borrowed = false;
            this.#release(props, resource);
        };

        return {
            get resource() {
                if (!borrowed) throw new Error("Resource is released back to the pool");
                return resource;
            },

            release,
            [Symbol.dispose]: release,
        };
    }

    #borrow(props: P): R {
        const subpool = this.#pool.getOrInsert(this.#deriveKey(props), []);
        const info = subpool.pop();
        return info?.resource ?? this.#factory(props);
    }

    #release(props: P, resource: R): void {
        if (this.#destroyed) {
            this.#destroy(resource);
            return;
        } else {
            const subpool = this.#pool.getOrInsert(this.#deriveKey(props), []);
            subpool.push({ resource, life: this.retention });
        }
    }

    /**
     * Destroy resources that aren't currently being borrowed
     *
     * This will destroy resources that aren't being borrowed at the moment this method is called. This does not mark
     * the pool as destroyed, so resources can still be borrowed or allocated.
     *
     * The main purpose of this method is to handle changes in some "constant" values (e.g. window size, configuration
     * changes). For example, there are 3 textures having the same size as window. When the window is resized, those 3
     * textures would remains unused for some amount of time before they gets destroyed. With "compacting", the textures
     * will be destroyed immediately if this method is called right after window size change.
     *
     * Or just create a new resource pool, who cares.
     */
    compact(): void {
        for (const [key, subpool] of this.#pool.entries()) {
            subpool.forEach((info) => this.#destroy(info.resource));
            this.#pool.set(key, []);
        }
    }

    /**
     * Mark this pool as destroyed and destroy all resources that are not currently borrowed
     *
     * Releasing the resource back to pool that is marked as destroyed will destroy the resource, instead of sending it
     * back to the pool for recycling.
     */
    destroy(): void {
        this.#destroyed = true;
        this.#pool.forEach((subpool) => subpool.forEach((info) => this.#destroy(info.resource)));
        this.#pool.clear();
    }

    [Symbol.dispose](): void {
        this.destroy();
    }
}

export interface ResourcePoolOptions<R, P> {
    readonly factory: (props: P) => R;

    /**
     * Callback function to destroy the resource
     *
     * If this function is not provided, a void function (which is `() => {}`) will be used as fallback.
     *
     * @param resource Resource being destroyed
     */
    readonly destroy?: (resource: R) => void;

    /**
     * The number of pool cycles to retain the resource while unused before it gets removed from the pool
     *
     * Each allocated resource in the pool is assigned a counter that initially set to a value provided from this
     * option. Every time {@link ResourcePool.cycle} is called, the counters will be decreased. Once the counter reaches
     * 0, on the next cycle, the resources will be destroyed. If the resource is borrowed, the counter will reset to
     * this retention value.
     *
     * If this value is not present, resources will be destroyed if not used in 1 cycle (previous cycle doesn't touches
     * the resource, so it gets destroyed on next cycle).
     */
    readonly retention?: number;

    /**
     * Derive key for `Map` based on given resource properties
     *
     * The key will be used for efficient resource lookup when using {@link ResourcePool}. If this option left blank,
     * default identity function will be used (which is `x => x`).
     *
     * @param props Properties to derive
     * @returns Value usable as `Map` key
     */
    readonly deriveKey?: (props: P) => unknown;
}

interface ResourceInfo<R> {
    readonly resource: R;
    life: number;
}

export interface Borrowed<R> extends Disposable {
    /**
     * Borrowed resource
     */
    readonly resource: R;

    /**
     * Release resource back to the pool
     *
     * This should be called when finished working with the resource, otherwise the pool will keep allocating new
     * resources while leaking borrowed one (since it's still being tracked by resource pool, so it won't be garbage
     * collected). Once released, the resource may be reused in the same cycle.
     */
    release(): void;
}
