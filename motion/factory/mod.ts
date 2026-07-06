/**
 * Nahara's Motion factory module.
 *
 * This module contains the factory components that a full instance of Nahara's Motion should use (eg: Nahara's Motion
 * Editor or Nahara's Motion Player). For embedding the scenes to existing applications, it would be ideal to pick out
 * only what is needed.
 *
 * @module
 */

import * as motion from "@nahara/motion";

import * as expr from "./expr/mod.ts";
import * as object from "./object/mod.ts";

export const bundle: motion.bundle.Bundle = new motion.bundle.BundleBuilder()
    .include(expr.bundle)
    .include(object.bundle)
    .build();

export { expr, object };
