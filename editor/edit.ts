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
    readonly loadedDeps: Readonly<Record<string, pkg.ResolvedModule>>;
    readonly compiled: motion.loader.LoadedModule;
}

export const EditState: {
    readonly create: (project: ProjectState, resolver: pkg.Resolver) => Promise<EditState>;
} = {
    create: async (project, resolver) => {
        const loadedDeps = Object.fromEntries(
            await Promise.all(
                Object
                    .entries(project.metadata.dependencies)
                    .map(async ([name, packageId]) => [name, await resolver.resolvePackage(packageId)] as const),
            ),
        );
        const compiled = ProjectState.compile(project, loadedDeps);

        return {
            project,
            loadedDeps,
            compiled,
        };
    },
};
