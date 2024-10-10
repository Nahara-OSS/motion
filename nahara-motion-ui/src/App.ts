import * as motion from "@nahara/motion";
import { writable, type Writable } from "svelte/store";
import type { PaneLayout, TabState } from "./ui/pane/PaneHost.svelte";

export class EditorImpl implements motion.IEditor {
    openedProject?: motion.IProject | undefined;
    openedScene?: motion.IScene | undefined;

    readonly projectStore: Writable<motion.IProject | undefined> = writable();
    readonly sceneStore: Writable<motion.IScene | undefined> = writable();

    constructor(
        public readonly layout: LayoutManagerImpl
    ) {}
    selections = new SelectionsManagerImpl();
    playback = new PlaybackManagerImpl();

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
        this.selections.clear();
        this.playback.changeState("paused");
        this.playback.seekTo(0);
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

export class SelectionsManagerImpl implements motion.ISelectionsManager {
    readonly objects = new ObjectSelectionImpl<motion.SceneObjectInfo>();
    readonly keyframes = new ObjectSelectionImpl<motion.Keyframe<any>>();
    readonly timeline = new TimelineSelectionImpl();

    clear() {
        this.objects.clear();
        this.keyframes.clear();
        this.timeline.select(0, 0);
    }
}

export class ObjectSelectionImpl<T> implements motion.IObjectSelection<T> {
    multiple: T[] = [];
    primary?: T | undefined = undefined;

    readonly selectionStore: Writable<ObjectSelectionImpl<T>> = writable();
    readonly multipleStore: Writable<T[]> = writable();
    readonly primaryStore: Writable<T | undefined> = writable();

    constructor() {
        this.selectionStore.set(this);
        this.multipleStore.set(this.multiple);
        this.primaryStore.set(this.primary);
    }

    addToSelection(target: T): void {
        if (!this.multiple.includes(target)) this.multiple.push(target);
        this.primary = target;
        this.sendUpdate();
    }

    removeFromSelection(target: T): void {
        const idx = this.multiple.indexOf(target);
        if (idx != -1) this.multiple.splice(idx, 1);
        if (this.primary == target) this.primary = this.multiple.length > 0
            ? this.multiple[this.multiple.length - 1]
            : undefined;
        this.sendUpdate();
    }

    clear(): void {
        this.multiple = [];
        this.primary = undefined;
        this.sendUpdate();
    }

    sendUpdate() {
        this.multipleStore.set(this.multiple);
        this.primaryStore.set(this.primary);
        this.selectionStore.update(a => a);
    }
}

export class TimelineSelectionImpl implements motion.ITimelineSelection {
    startTime: number = 0;
    endTime: number = 0;

    readonly startTimeStore: Writable<number> = writable(0);
    readonly endTimeStore: Writable<number> = writable(0);

    select(from: number, to: number): void {
        this.startTime = from; this.startTimeStore.set(from);
        this.endTime = to; this.endTimeStore.set(to);
    }
}

export class PlaybackManagerImpl implements motion.IPlaybackManager {
    currentTime: number = 0;
    deltaTime: number = 0;
    state: motion.PlaybackState = "paused";
    rate: number = 1;
    fps: motion.PlaybackFPS = "vsync";

    readonly currentTimeStore: Writable<number> = writable(0);
    readonly stateStore: Writable<motion.PlaybackState> = writable("paused");

    seekTo(time: number): void {
        this.currentTime = time;
        this.currentTimeStore.set(time);
    }

    changeState(state: motion.PlaybackState): void {
        if (this.state == state) return;

        if (state != "paused" && this.state == "paused") {
            const self = this;
            let lastTimestamp = -1;

            function renderLoop(timestamp: number) {
                let deltaTime = lastTimestamp == -1 ? 0 : (timestamp - lastTimestamp);
                deltaTime *= self.state == "playing-backward" ? -self.rate : self.rate;
                self.deltaTime = deltaTime;
                self.seekTo(self.currentTime + deltaTime * self.rate); // TODO Match fps here
                lastTimestamp = timestamp;
                if (self.state != "paused") window.requestAnimationFrame(renderLoop);
            }

            window.requestAnimationFrame(renderLoop);
        }

        this.state = state;
        this.stateStore.set(state);
    }
}