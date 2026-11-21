import type * as motion from "@nahara/motion";

/**
 * Package registry
 */
export abstract class Registry {
    abstract readonly info: RegistryInfo;

    /**
     * Check whether the package can be resolved by this registry
     *
     * @param id Package identifier
     */
    abstract checkPackage(id: string): CheckResult;

    /**
     * Resolve for package
     *
     * @param options Resolve options
     */
    abstract resolve(options: ResolveOptions): Promise<ResolvedModule>;
}

export interface RegistryInfo {
    readonly name: string | null;
    readonly description: string | null;
}

export type ResolvedModule = Readonly<Record<string, motion.runtime.Element>>;

export interface ResolveOptions {
    /**
     * Package identifier to resolve
     */
    readonly id: string;

    /**
     * Resolve for package
     *
     * The registry implementation should call this function instead of trying to resolve package on its own so that
     * circular dependency detection can function properly.
     *
     * @param id Package identifier
     * @returns Resolved module
     */
    readonly resolve: (id: string) => PromiseLike<ResolvedModule> | ResolvedModule;
}

export enum CheckResult {
    /**
     * Package identifier may be resolved by registry
     */
    Inclusive,

    /**
     * Package identifier will exclusively be resolved by registry
     *
     * If the registry return this, other registries will not attempt to resolve the package.
     */
    Exclusive,

    /**
     * Package identifier cannot be resolved by registry
     */
    Reject,
}
