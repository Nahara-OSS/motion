import * as motion from "@nahara/motion";

import * as color from "./color.ts";
import * as math from "./math.ts";
import * as primitive from "./primitive.ts";
import * as vector from "./vector.ts";

export const bundle: motion.bundle.Bundle = new motion.bundle.BundleBuilder()
    .include(primitive.bundle)
    .include(math.bundle)
    .include(vector.bundle)
    .include(color.bundle)
    .build();

export { math, primitive, vector };
