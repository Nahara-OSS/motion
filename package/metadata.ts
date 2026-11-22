export interface PackageMetadata {
    /**
     * Entry point of the package
     *
     * The entry point must be relative to the metadata file and must be a module.
     */
    readonly entry: string;

    /**
     * Dependency map in this package
     *
     * This dependency map also describe all dependencies that the package is going to use. Primarily used by editor to
     * fetch dependencies ahead of time.
     */
    readonly dependencies: Readonly<Record<string, string>>;
}

export const PackageMetadata: {
    readonly filename: string;
} = {
    filename: "vn.io.nahara.motion.json",
};
