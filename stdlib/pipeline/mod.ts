/**
 * Pipeline module
 *
 * @module
 */

import type * as motion from "@nahara/motion";
import * as pathStencil from "./path-stencil.ts";
import * as solidFill from "./solid-fill.ts";
import * as graphicsFill from "./graphics-fill.ts";

export interface AllPipelines {
    /**
     * Stencil pipelines
     */
    readonly stencil: {
        readonly path: ReturnType<typeof pathStencil.create>;
    };

    /**
     * Fill pipelines
     */
    readonly fill: {
        readonly solid: ReturnType<typeof solidFill.create>;
        readonly graphics: ReturnType<typeof graphicsFill.create>;
    };
}

const CACHE_KEY = Symbol("Pipeline cache key");

export function cacheAll(cache: motion.context.CacheContext, env: motion.graphics.GraphicsEnv): AllPipelines {
    return cache.get({
        key: CACHE_KEY,
        factory: () => createAll(env),
    });
}

export function createAll(env: motion.graphics.GraphicsEnv): AllPipelines {
    return {
        stencil: {
            path: pathStencil.create(env),
        },

        fill: {
            solid: solidFill.create(env),
            graphics: graphicsFill.create(env),
        },
    };
}

export { graphicsFill, pathStencil, solidFill };
