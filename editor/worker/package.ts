import * as motion from "@nahara/motion";
import * as stdlib from "@nahara/motion-stdlib";

/**
 * Interface for packages
 *
 * {@link Package} is only returned from package resolver. The loaded project would use {@link motion.loader.loadModule}
 * on project source directly.
 */
export interface Package {
    readonly metadata: PackageMetadata;
    readonly exports: Readonly<Record<string, motion.runtime.Element>>;
}

/**
 * Semver (Semantic versioning) version number
 *
 * A single version number consists of 3 parts:
 *
 * - Major: Bump when there are breaking changes
 * - Minor: Bump when there are new features (but does not break backward compatibility)
 * - Patch: Bump when there are bug fixes that doesn't break backward compatibility
 *
 * The so-called "new version" where the package is recreated from the ground up with entirely different API should not
 * bump the package version number. Consider using different package name instead (maybe try namespacing?).
 */
export type Semver = `${number}.${number}.${number}`;

/**
 * Package metadata
 */
export interface PackageMetadata {
    // we don't include `name` field in metadata, as that is handled by package registry or tooling (e.g. provide
    // `--name` option when publishing to registry using CLI tool)

    readonly author?: string;
    readonly license?: string;
    readonly entry: string;

    /**
     * Dependencies this package is using
     *
     * The record key is the module identifier alias that points the module identifier to package's entry module. For
     * example:
     *
     * ```json
     * {
     *     "entry": "./main.mdl",
     *     "dependencies": {
     *         "filters": { "package": "@nahara/filters", "version": "1.0.0" }
     *     }
     * }
     * ```
     *
     * Inside MDL, the package can be imported as follows:
     *
     * ```mdl
     * import { ChromaticAberration } from "filters";
     * ```
     */
    readonly dependencies?: Readonly<Record<string, Dependency>>;
}

export const PackageMetadata: {
    readonly FILE_NAME: string;
} = {
    FILE_NAME: "vn.io.nahara.motion.json",
};

export interface Dependency {
    readonly package: string;
    readonly version: Semver;
}

export interface Registry {
    readonly name: string | null;
    readonly description: string | null;

    /**
     * Check whether the given package name may be resolved by this registry
     *
     * If the function return `false`, the package will not be fetched from this registry.
     *
     * @param name Package name
     */
    canResolve(name: string): boolean;

    /**
     * Fetch package from this registry
     *
     * Throw an error if the registry cannot fetch the package for any reason (not found, unauthorized, etc).
     *
     * @param name Package name
     */
    fetchPackage(name: string): Promise<Package>;
}

export const Registry: {
    core: Registry;
    stdlib: Registry;
} = {
    core: {
        name: "Nahara's Motion",
        description: "Built-in types and functions",
        canResolve: (name) => name == "builtin:core",
        fetchPackage: (name: string) => {
            if (name != "builtin:core") throw new Error("This registry can only resolve builtin:core");
            return Promise.resolve({
                metadata: { entry: "<built-in module>" },
                exports: motion.runtime.coreModule,
            });
        },
    },

    stdlib: {
        name: "Standard library",
        description: "Standard primitive building blocks for motion graphics",
        canResolve: (name) => name.startsWith("builtin:"),
        fetchPackage: (name: string) => {
            if (!name.startsWith("builtin:")) {
                throw new Error("This registry can only resolve packages under builtin namespace");
            }

            const pkgId = name.substring("builtin:".length);
            if (!(pkgId in stdlib)) throw new Error(`Package not found: ${name}`);

            return Promise.resolve({
                metadata: { entry: "<builtin-in module>" },
                exports: stdlib[pkgId as keyof typeof stdlib],
            });
        },
    },
};
