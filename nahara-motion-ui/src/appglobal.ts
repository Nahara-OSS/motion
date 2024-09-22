import * as motion from "@nahara/motion";
import { writable } from "svelte/store";
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

export namespace app {
    let logger = new motion.utils.Logger("app");
    logger.info("Initializing Nahara's Motion UI...");
    
    let currentProject: motion.IProject = new motion.Project({
        name: "Empty project",
        description: "Describe your top tier motion graphics here!",
        workingTime: 0
    });
    let currentScene: motion.IScene | undefined = currentProject.newScene({
        name: "Scene",
        size: { x: 1920, y: 1080 }
    });
    let currentSelection: ObjectsSelection | undefined = undefined;
    let currentSeekhead: Seekhead = {
        position: 0
    };
    let playbackState: "forward" | "backward" | "paused" = "paused";

    // Component stores
    export const currentProjectStore = writable(currentProject);
    export const currentSceneStore = writable<motion.IScene | undefined>(currentScene);
    export const currentSelectionStore = writable<ObjectsSelection | undefined>();
    export const currentSeekheadStore = writable(currentSeekhead);
    export const playbackStateStore = writable<"forward" | "backward" | "paused">(playbackState);

    export function getCurrentProject() { return currentProject; }
    export function openProject(project: motion.IProject) {
        logger.info(`Opening project: ${project.metadata.name ?? "<Unnamed>"}`);
        currentProject = project;
        currentProjectStore.set(currentProject);
        openScene([...project.scenes][0]);
    }

    export function getCurrentScene() { return currentScene; }
    export function openScene(scene: motion.IScene | undefined) {
        logger.info(`Opening scene: ${scene ? scene.metadata.name ?? "<Unnamed>" : "<Unload>"}`)
        currentScene = scene;
        currentSceneStore.set(scene);
        deselectAll();
    }

    export function getCurrentSelection() { return currentSelection; }
    export function deselectAll() {
        currentSelection = undefined;
        currentSelectionStore.set(undefined);
    }
    export function selectSingle(object: motion.SceneObjectInfo) {
        currentSelection = { primary: object, multiple: [object] };
        currentSelectionStore.set(currentSelection);
    }
    export function selectMulti(object: motion.SceneObjectInfo, allowDeselecting = true) {
        if (!currentSelection) {
            selectSingle(object);
            return;
        }

        if (currentSelection.multiple.includes(object)) {
            if (!allowDeselecting) {
                currentSelection.primary = object;
                currentSelectionStore.set(currentSelection);
                return;
            }

            const idx = currentSelection.multiple.indexOf(object);
            const [deselected] = currentSelection.multiple.splice(idx, 1);
            if (deselected == currentSelection.primary) currentSelection.primary = currentSelection.multiple[idx];

            if (!currentSelection.primary) {
                if (currentSelection.multiple.length == 0) {
                    deselectAll();
                    return;
                }

                currentSelection.primary = currentSelection.multiple[0];
            }

            currentSelectionStore.set(currentSelection);
            return;
        }

        currentSelection.multiple.push(object);
        currentSelection.primary = object;
        currentSelectionStore.set(currentSelection);
    }

    export function getSeekhead() { return structuredClone(currentSeekhead); }
    export function updateSeekhead(seekhead: Seekhead) {
        currentSeekhead = seekhead;
        currentSeekheadStore.set(seekhead);
    }
    export function getPlaybackState() { return playbackState; }
    export function setPlaybackState(state: typeof playbackState) {
        playbackState = state;
        playbackStateStore.set(state);

        if (state != "paused") {
            let prevTimestamp = -1;

            function renderCallback(timestamp: number) {
                const delta = timestamp - prevTimestamp;
                if (prevTimestamp != -1) updateSeekhead({ position: currentSeekhead.position + delta });
                if (playbackState != "paused") requestAnimationFrame(renderCallback);
                prevTimestamp = timestamp;
            }

            requestAnimationFrame(renderCallback);
        }
    }

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