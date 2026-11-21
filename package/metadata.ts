export interface PackageMetadata {
    /**
     * Entry point of the package
     * 
     * The entry point must be relative to the metadata file and must be a module.
     */
    readonly entry: string;
}

export const PackageMetadata: {
    readonly filename: string;
} = {
    filename: "vn.io.nahara.motion.json",
};
