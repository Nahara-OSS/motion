export function compareKeys(a: unknown[], b: unknown[]): boolean {
    if (a.length != b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

/**
 * Cache values with multiple keys.
 *
 * This class allows identifying a value by multiple keys (instead of 1 like `Map<K, V>`). The main purpose is to cache
 * GPU pipelines (eg: creating pipeline based on framebuffer's color and depth stencil format).
 */
export class MultikeyCache<T> implements Disposable {
    #cached: [keys: unknown[], value: T, visited: boolean][] = [];

    getOrCache(factory: () => T, keys: unknown[]): T {
        const cached = this.#cached.find(([k]) => compareKeys(k, keys));

        if (cached != null) {
            cached[2] = true;
            return cached[1];
        }

        const value = factory();
        this.#cached.push([keys, value, true]);
        return value;
    }

    finish(): void {
        this.#cached = this.#cached.filter((v) => {
            const [_, value, visited] = v;

            if (!visited) {
                (value as Disposable)?.[Symbol.dispose]();
                return false;
            }

            v[2] = false;
            return true;
        });
    }

    [Symbol.dispose](): void {
        this.#cached.forEach(([_, value]) => (value as Disposable)?.[Symbol.dispose]());
        this.#cached = [];
    }
}
