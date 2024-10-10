import * as motion from "@nahara/motion";
import type { DropdownEntry, TreeDropdownEntry } from "./ui/menu/FancyMenu";

export interface ObjectsSelection {
    /**
     * The most recent selected object. Add button will only add to the primary container.
     */
    primary: motion.SceneObjectInfo;

    /**
     * A collection of all selected objects.
     */
    multiple: motion.SceneObjectInfo[];
}

export interface Seekhead {
    /**
     * Position of the seek head in milliseconds. Always relative to the start of the scene timeline.
     */
    position: number;
}

// TODO: Very big TODO - Move everything to IEditor and EditorImpl
// IEditor expose states of the editor to addons
// EditorImpl is the implementation of IEditor that exposes the states to addons

export namespace app {
    let logger = new motion.utils.Logger("app");
    logger.info("Initializing Nahara's Motion UI...");

    /**
     * Create menu entries for adding object
     */
    export function createAddObjectMenu(callback?: (type: motion.ISceneObjectType) => any): DropdownEntry[] {
        const categoryMap = new Map<string, TreeDropdownEntry>();
        const categories: DropdownEntry[] = [];
    
        function getCategory(id: string, name: string) {
            let out = categoryMap.get(id);

            if (!out) {
                categoryMap.set(id, out = { type: "tree", name, icon: `category.${id}`, children: [] });
                categories.push(out);
            }

            return out;
        }

        for (const entry of motion.registries.Objects) {
            const category = getCategory(
                entry.registerable.category ?? "uncategorized",
                entry.registerable.category ?? "(Uncategorized)"
            );
            category.children.push({
                type: "simple",
                name: entry.registerable.name ?? entry.id,
                description: entry.addon.name ?? motion.addons.getIdByAddon(entry.addon) ?? "<unknown addon>",
                click: callback ? () => callback(entry.registerable) : undefined
            });
        }

        return categories;
    }
}