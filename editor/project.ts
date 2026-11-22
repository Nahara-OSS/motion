import type * as motion from "@nahara/motion";
import type * as pkg from "@nahara/motion-package";
import { resolvePath } from "./internal.ts";

export interface ProjectState {
    readonly metadata: pkg.PackageMetadata;
    readonly root: Readonly<Partial<Record<string, ProjectItem>>>;
}

export type ProjectItem =
    | ProjectModuleItem
    | ProjectAssetItem
    | ProjectFolderItem;

export enum ItemType {
    Module,
    Asset,
    Folder,
}

export interface ProjectModuleItem {
    readonly type: ItemType.Module;
    readonly source: motion.model.Module;
}

export interface ProjectAssetItem {
    readonly type: ItemType.Asset;
    readonly source: Blob;
}

export interface ProjectFolderItem {
    readonly type: ItemType.Folder;
    readonly entries: Readonly<Partial<Record<string, ProjectItem>>>;
}

export const ProjectState: {
    /**
     * Get item in project bin
     */
    readonly getItem: {
        (state: ProjectState, path: readonly string[], require?: true): ProjectItem;
        (state: ProjectState, path: readonly string[], require: false): ProjectItem | null;
        (state: ProjectState, path: readonly string[], require?: boolean): ProjectItem | null;
    };

    /**
     * Get entry point of project
     *
     * @param state Project state
     * @returns Entry module
     */
    readonly getEntry: (state: ProjectState) => motion.model.Module;

    /**
     * Set an item inside project's asset bin
     *
     * @param state Project state
     * @param path Path to item
     * @param item Item to set
     * @returns New project state
     */
    readonly setItem: (
        state: ProjectState,
        path: readonly string[],
        item: ProjectItem,
    ) => ProjectState;

    /**
     * Update an existing item inside project's asset bin
     *
     * @param state Project state
     * @param path Path to item
     * @param updater Item updater
     * @returns New project state
     */
    readonly updateItem: (
        state: ProjectState,
        path: readonly string[],
        updater: (item: ProjectItem) => ProjectItem,
    ) => ProjectState;

    /**
     * Remove an item inside project's asset bin
     *
     * @param state Project state
     * @param path Path to item
     * @returns New project state
     */
    readonly deleteItem: (
        state: ProjectState,
        path: readonly string[],
    ) => ProjectState;

    /**
     * Update entry point of project
     *
     * @param state Project state
     * @param updater Module updater
     * @returns New project state
     */
    readonly updateEntry: (
        state: ProjectState,
        updater: (module: motion.model.Module) => motion.model.Module,
    ) => ProjectState;
} = {
    getItem: <(typeof ProjectState)["getItem"]> function (s: ProjectState, path: readonly string[], require = true) {
        return ProjectFolderItem.get(ProjectItem.folder(s.root), path, require);
    },

    getEntry: (state) => {
        const item = ProjectState.getItem(state, resolvePath(state.metadata.entry));
        if (item.type != ItemType.Module) throw new Error(`${state.metadata.entry} is not a module`);
        return item.source;
    },

    setItem: (state, path, item) => {
        const prev = ProjectItem.folder(state.root);
        const next = ProjectFolderItem.set(prev, path, item);
        if (next === prev) return state;
        return { ...state, root: next.entries };
    },

    updateItem: (state, path, updater) => {
        const prev = ProjectItem.folder(state.root);
        const next = ProjectFolderItem.update(prev, path, updater);
        if (next === prev) return state;
        return { ...state, root: next.entries };
    },

    deleteItem: (state, path) => {
        const prev = ProjectItem.folder(state.root);
        const next = ProjectFolderItem.delete(prev, path);
        if (next === prev) return state;
        return { ...state, root: next.entries };
    },

    updateEntry: (state, updater) => (ProjectState.updateItem(state, resolvePath(state.metadata.entry), (item) => {
        if (item.type != ItemType.Module) return item;
        const next = updater(item.source);
        if (next === item.source) return item;
        return { ...item, source: next };
    })),
};

export const ProjectItem: {
    readonly module: (source: motion.model.Module) => ProjectModuleItem;
    readonly asset: (source: Blob) => ProjectAssetItem;
    readonly folder: (entries: Readonly<Partial<Record<string, ProjectItem>>>) => ProjectFolderItem;
} = {
    module: (source) => ({ type: ItemType.Module, source }),
    asset: (source) => ({ type: ItemType.Asset, source }),
    folder: (entries) => ({ type: ItemType.Folder, entries }),
};

export const ProjectFolderItem: {
    readonly get: {
        (folder: ProjectFolderItem, path: readonly string[], require?: true): ProjectItem;
        (folder: ProjectFolderItem, path: readonly string[], require: false): ProjectItem | null;
        (folder: ProjectFolderItem, path: readonly string[], require?: boolean): ProjectItem | null;
    };

    readonly set: (folder: ProjectFolderItem, path: readonly string[], item: ProjectItem) => ProjectFolderItem;

    readonly update: (
        folder: ProjectFolderItem,
        path: readonly string[],
        updater: (item: ProjectItem) => ProjectItem,
    ) => ProjectFolderItem;

    readonly delete: (folder: ProjectFolderItem, path: readonly string[]) => ProjectFolderItem;
} = {
    get: <(typeof ProjectFolderItem)["get"]> function get(bin: ProjectFolderItem, pth: readonly string[], req = true) {
        if (pth.length == 0) {
            return bin;
        }

        const next = bin.entries[pth[0]];

        if (next == null) {
            if (req) throw new Error(`Item not found in folder: ${pth[0]}`);
            return null;
        }

        if (pth.length == 1) {
            return next;
        }

        if (next.type != ItemType.Folder) {
            if (req) throw new Error(`Trying to access ${pth[1]} in non-folder item: ${pth[0]}`);
            return null;
        }

        try {
            return get(next, pth.slice(1), req);
        } catch (e) {
            throw new Error(`Error while trying to access ${pth.join("/")}`, { cause: e });
        }
    },

    set: (folder, path, item) => {
        if (path.length == 0) {
            return folder;
        }

        if (path.length == 1) {
            return {
                ...folder,
                entries: {
                    ...folder.entries,
                    [path[0]]: item,
                },
            };
        }

        return ProjectFolderItem.update(folder, path.slice(0, path.length - 1), (item0) => {
            if (item0.type != ItemType.Folder) return item0;
            return ProjectFolderItem.set(folder, [path[path.length - 1]], item);
        });
    },

    update: (folder, path, updater) => {
        if (path.length == 0) {
            const next = updater(folder);
            if (next.type != ItemType.Folder) return folder;
            return next;
        }

        const prev = folder.entries[path[0]];
        if (prev == null) return folder;

        const next = path.length == 1
            ? updater(prev)
            : prev.type == ItemType.Folder
            ? ProjectFolderItem.update(prev, path.slice(1), updater)
            : prev;

        if (next === prev) {
            return folder;
        }

        return {
            ...folder,
            entries: {
                ...folder.entries,
                [path[0]]: next,
            },
        };
    },

    delete: (folder, path) => {
        if (path.length == 0) {
            return folder;
        }

        if (path.length == 1) {
            return {
                ...folder,
                entries: Object.fromEntries(
                    Object
                        .entries(folder.entries)
                        .filter(([name]) => name != path[0]),
                ),
            };
        }

        return ProjectFolderItem.update(folder, path.slice(0, path.length - 1), (item) => {
            if (item.type != ItemType.Folder) return item;
            return ProjectFolderItem.delete(item, [path[path.length - 1]]);
        });
    },
};
