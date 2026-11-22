import * as motion from "@nahara/motion";
import type * as pkg from "@nahara/motion-package";
import { ItemType, ProjectState } from "./project.ts";
import { resolvePath } from "./internal.ts";

/**
 * Edit state
 *
 * Edit state is typically used together with `HistoryStack<S>` to track edit history.
 */
export interface EditState {
    readonly project: ProjectState;
    readonly compiled: motion.loader.LoadedModule;
}

export const EditState: {
    readonly create: (project: ProjectState, resolver: pkg.Resolver) => Promise<EditState>;
} = {
    create: async (project, resolver) => {
        const compiled = await compile(project, resolver);

        return {
            project,
            compiled,
        };
    },
};

function compile(project: ProjectState, resolver: pkg.Resolver): Promise<motion.loader.LoadedModule> {
    const entry = ProjectState.getEntry(project);
    return motion.loader.loadModule({
        source: entry,
        resolve: async (module, name) => await resolver.resolveElement(module, name),
        asset: (name) => {
            const assetPath = resolvePath(project.metadata.entry, "..", name);
            const item = ProjectState.getItem(project, assetPath, true);
            if (item.type != ItemType.Asset) throw new Error(`Not an asset: ${assetPath.join("/")}`);
            return item.source;
        },
    });
}
