<script lang="ts" context="module">
    export class EditorImpl implements motion.IEditor {
        openedProject?: motion.IProject | undefined;
        openedScene?: motion.IScene | undefined;

        readonly projectStore: Writable<motion.IProject | undefined> = writable();
        readonly sceneStore: Writable<motion.IScene | undefined> = writable();

        constructor(
            public readonly layout: LayoutManagerImpl
        ) {}

        openProject(project: motion.IProject): void {
            if (project == this.openedProject) return;
            if (this.openedProject) this.closeProject();
            this.openedProject = project;
            this.projectStore.set(project);
        }

        closeProject(): void {
            if (this.openedScene) this.closeScene();
            this.openedProject = undefined;
            this.projectStore.set(undefined);
        }

        openScene(scene: motion.IScene): void {
            if (scene == this.openedScene) return;
            if (this.openedScene) this.closeScene();
            this.openedScene = scene;
            this.sceneStore.set(scene);
        }

        closeScene(): void {
            this.openedScene = undefined;
            this.sceneStore.set(undefined);
        }
    }

    interface EditorLayout extends motion.IEditorLayout {
        states: Record<string, TabState>;
        layout: PaneLayout;
    }

    export class LayoutManagerImpl implements motion.IEditorLayoutManager {
        readonly currentStore: Writable<EditorLayout> = writable();
        readonly allLayoutsStore: Writable<motion.EditorLayoutEntry[]> = writable([]);

        constructor(
            private _current: EditorLayout,
            public readonly allLayouts: motion.EditorLayoutEntry[]
        ) {
            this.currentStore.set(_current);
            this.allLayoutsStore.set(allLayouts);
        }

        get current() { return this._current; }
        set current(layout: motion.IEditorLayout) {
            this._current = layout as EditorLayout;
            this.currentStore.set(layout as EditorLayout);
        }

        add(name: string, layout: motion.IEditorLayout): motion.EditorLayoutEntry {
            const entry: motion.EditorLayoutEntry = { name, layout: structuredClone(layout) };
            this.allLayouts.push(entry);
            this.allLayoutsStore.set(this.allLayouts);
            return entry;
        }

        remove(entry: motion.EditorLayoutEntry): void {
            const idx = this.allLayouts.indexOf(entry);
            if (idx == -1) return;
            this.allLayouts.splice(idx, 1);
            this.allLayoutsStore.set(this.allLayouts);
        }
    }
</script>

<script lang="ts">
    import * as motion from "@nahara/motion";
    import MediaBar from "./ui/bar/MediaBar.svelte";
    import TopBar from "./ui/bar/TopBar.svelte";
    import MenuHost from "./ui/menu/MenuHost.svelte";
    import OutlinerPane from "./ui/outliner/OutlinerPane.svelte";
    import PaneHost, { SplitDirection, type PaneLayout, type TabState } from "./ui/pane/PaneHost.svelte";
    import PropertiesPane from "./ui/properties/PropertiesPane.svelte";
    import TimelinePane from "./ui/timeline/TimelinePane.svelte";
    import ViewportPane from "./ui/viewport/ViewportPane.svelte";
    import PopupHost, { openPopupAt } from "./ui/popup/PopupHost.svelte";
    import AnimationGraphPane from "./ui/graph/AnimationGraphPane.svelte";
    import EmptyPane from "./ui/pane/EmptyPane.svelte";
    import { writable, type Readable, type Writable } from "svelte/store";
    import ProjectPane from "./ui/project/ProjectPane.svelte";

    let layoutManager = new LayoutManagerImpl({
        layout: {
            type: "split",
            direction: SplitDirection.LeftToRight,
            firstSize: 300,
            first: {
                type: "split",
                direction: SplitDirection.BottomToTop,
                firstSize: 500,
                first: { type: "tab", tabs: ["default-project", "default-files"], selected: "default-project" },
                second: { type: "tab", tabs: ["default-outliner"], selected: "default-outliner" }
            },
            second: {
                type: "split",
                direction: SplitDirection.BottomToTop,
                firstSize: 300,
                first: { type: "tab", tabs: ["default-timeline", "default-animationGraph"], selected: "default-timeline" },
                second: {
                    type: "split",
                    direction: SplitDirection.RightToLeft,
                    firstSize: 300,
                    first: { type: "tab", tabs: ["default-properties", "default-modifiers"], selected: "default-properties" },
                    second: { type: "tab", tabs: ["default-viewport"], selected: "default-viewport" }
                }
            }
        },
        states: {
            "default-files": { type: "files", state: {} },
            "default-project": { type: "project", state: {} },
            "default-outliner": { type: "outliner", state: {} },
            "default-timeline": { type: "timeline", state: {} },
            "default-animationGraph": { type: "animationGraph", state: {} },
            "default-properties": { type: "properties", state: {} },
            "default-modifiers": { type: "modifiers", state: {} },
            "default-viewport": { type: "viewport", state: {} }
        }
    }, []);
    const currentLayout = layoutManager.currentStore;

    let editor = new EditorImpl(layoutManager);
</script>

<div class="app">
    <div class="content">
        <TopBar {editor} />
        <PaneHost
            layout={$currentLayout.layout}
            states={$currentLayout.states}
            component={type => {
                switch (type) {
                    case "properties": return PropertiesPane;
                    case "timeline": return TimelinePane;
                    case "outliner": return OutlinerPane;
                    case "viewport": return ViewportPane;
                    case "animationGraph": return AnimationGraphPane;
                    case "project": return ProjectPane;
                    default: return EmptyPane;
                };
            }}
            extra={{ editor }}
            on:layoutupdate={e => $currentLayout.layout = e.detail}
        />
        <MediaBar />
    </div>
    <PopupHost />
    <MenuHost />
</div>

<style lang="scss">
    .app {
        position: relative;
        width: 100%;
        height: 100%;

        .content {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
    }
</style>