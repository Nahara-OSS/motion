import * as motion from "@nahara/motion";

import * as loops from "./loops.ts";

export const bundle: motion.bundle.Bundle = new motion.bundle.BundleBuilder()
    .include(loops.bundle)
    .build();

export * from "./properties.ts";
export { loops };
