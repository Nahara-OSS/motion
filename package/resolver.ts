import type * as motion from "@nahara/motion";
import { CheckResult, type Registry, type ResolvedModule } from "./registry.ts";

export interface ResolverOptions {
    /**
     * List of registries to be used
     *
     * The registries are sorted in priority order. The first registry that takes exclusive resolution of package will
     * be the only registry that resolves the package, otherwise take the resolved module from the first registry that
     * successfully resolved the package.
     */
    readonly registries: readonly Registry[];
}

/**
 * Package resolver
 *
 * Each instance of resolver maintain its own resolution cache that will never expire through its lifetime (so the only
 * way to invalidate cache is to create a new resolver).
 */
export class Resolver {
    #registries: readonly Registry[];
    #resolving = new Set<string>();
    #cache = new Map<string, ResolvedModule>();

    constructor(options: ResolverOptions) {
        this.#registries = options.registries;
    }

    /**
     * Resolve for package
     *
     * @param packageId Package identifier
     */
    async resolvePackage(packageId: string): Promise<ResolvedModule> {
        const cached = this.#cache.get(packageId);
        if (cached != null) return cached;

        if (this.#resolving.has(packageId)) {
            throw new Error(`Package ${packageId} is still being resolved (circular dependency?)`);
        }

        try {
            const inclusive: Registry[] = [];
            let exclusive: Registry | null = null;

            this.#resolving.add(packageId);

            for (const registry of this.#registries) {
                const result = registry.checkPackage(packageId);

                switch (result) {
                    case CheckResult.Inclusive: {
                        inclusive.push(registry);
                        continue;
                    }

                    case CheckResult.Exclusive: {
                        exclusive = registry;
                        break;
                    }

                    case CheckResult.Reject: {
                        continue;
                    }
                }

                if (exclusive != null) {
                    break;
                }
            }

            if (exclusive != null) {
                const mod = await exclusive.resolve({ id: packageId, resolve: (id) => this.resolvePackage(id) });
                this.#cache.set(packageId, mod);
                return mod;
            } else {
                const errors: unknown[] = [];

                for (const registry of inclusive) {
                    try {
                        const mod = await registry.resolve({ id: packageId, resolve: (id) => this.resolvePackage(id) });
                        this.#cache.set(packageId, mod);
                        return mod;
                    } catch (e) {
                        errors.push(e);
                    }
                }

                throw new AggregateError(errors, `No registries can resolve ${packageId}`);
            }
        } finally {
            this.#resolving.delete(packageId);
        }
    }

    /**
     * Resolve for element from package
     *
     * @param packageId Package identifier
     * @param name Exported element name
     */
    async resolveElement(packageId: string, name: string): Promise<motion.runtime.Element> {
        const pkg = await this.resolvePackage(packageId);
        if (name in pkg) return pkg[name];
        throw new Error(`Element ${name} does not exists in package ${packageId}`);
    }
}
