import { getContext } from "svelte";
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, Observable, Subject } from "rxjs";
import { RootFolder } from "./files.ts";
import { Settings } from "./settings.ts";
import type { WorkspaceState } from "./workspace.ts";
import type { PanelState } from "./panel/panels.ts";
import { bundle, scene, timing } from "@nahara/motion";
import * as factory from "@nahara/motion/factory";
import { Keybind } from "./keyboard.ts";

/**
 * View model layer of Nahara's Motion Editor.
 */
export class EditorSession {
    readonly project = new BehaviorSubject<ProjectSession | null>(null);
    readonly workspace = new BehaviorSubject<WorkspaceState<PanelState>>(defaultWorkspace);
    readonly settings = new BehaviorSubject<Settings>(Settings);
    readonly keybind = new BehaviorSubject<Keybind>(Keybind);

    private constructor(
        public readonly appRoot: RootFolder,
        public readonly gpu: GPUDevice,
        public readonly bundle: bundle.Bundle,
    ) {
    }

    static async create(): Promise<EditorSession> {
        const [appRoot, gpuAdapter] = await Promise.all([
            navigator.storage.getDirectory().then(RootFolder.createRoot),
            navigator.gpu.requestAdapter(),
        ]);

        if (gpuAdapter == null) {
            throw new Error("No GPU detected");
        }

        const [gpu] = await Promise.all([
            gpuAdapter.requestDevice(),
        ]);

        return new EditorSession(
            appRoot,
            gpu,
            factory.bundle,
        );
    }
}

export class ProjectSession {
    readonly path = new BehaviorSubject<readonly string[]>([]);
    readonly scene = new BehaviorSubject<SceneSession | null>(null);

    constructor(
        public readonly projectRoot: RootFolder,
    ) {
    }

    get name(): string {
        return this.projectRoot.rootName;
    }
}

export class SceneSession {
    #undoStack = new BehaviorSubject<readonly HistoryEntry[]>([]);
    #redoStack = new BehaviorSubject<readonly HistoryEntry[]>([]);
    #savedHistoryId = new BehaviorSubject<string | null>(null);
    #scene: BehaviorSubject<scene.Scene>;
    #state = new BehaviorSubject<"paused" | "playing">("paused");
    #seekheadPositionChanged = new Subject<void>();
    #lastPlayTime = performance.now();
    #seekheadInitialPosition: number;

    readonly seekhead$: Observable<number>;
    readonly graphicsSeekhead$: Observable<number>;

    readonly selectedObjectIds = new BehaviorSubject<string[]>([]);

    constructor(
        public readonly project: ProjectSession,
        public readonly path: readonly string[],
        scene: scene.Scene,
    ) {
        this.#scene = new BehaviorSubject(scene);
        this.#seekheadInitialPosition = scene.timeline.startTick;

        this.seekhead$ = new Observable((subscriber) => {
            let subscribed = true;
            subscriber.next(this.seekhead);

            const renderLoop = () => {
                subscriber.next(this.seekhead);
                if (subscribed && this.#state.value == "playing") requestAnimationFrame(renderLoop);
            };

            subscriber.add(this.#state.subscribe((state) => {
                if (state == "playing") requestAnimationFrame(renderLoop);
            }));

            subscriber.add(this.#seekheadPositionChanged.subscribe(() => {
                subscriber.next(this.seekhead);
            }));

            subscriber.add({
                unsubscribe: () => {
                    subscribed = false;
                },
            });
        });

        this.graphicsSeekhead$ = combineLatest([this.seekhead$, this.#scene]).pipe(
            map(([seekhead, { timeline: { tickRate }, graphics: { fps } }]) => {
                const frame = Math.floor(seekhead * fps / tickRate);
                return frame * tickRate / fps;
            }),
            distinctUntilChanged(),
        );
    }

    get name(): string {
        const filename = this.path[this.path.length - 1];
        return filename.endsWith(".scene") ? filename.substring(0, filename.length - 6) : filename;
    }

    get scene(): scene.Scene {
        return this.#scene.value;
    }

    get scene$(): Observable<scene.Scene> {
        return this.#scene;
    }

    get undoStack(): readonly HistoryEntry[] {
        return this.#undoStack.value;
    }

    get undoStack$(): Observable<readonly HistoryEntry[]> {
        return this.#undoStack;
    }

    get redoStack(): readonly HistoryEntry[] {
        return this.#redoStack.value;
    }

    get redoStack$(): Observable<readonly HistoryEntry[]> {
        return this.#redoStack;
    }

    get state(): "paused" | "playing" {
        return this.#state.value;
    }

    set state(state: "paused" | "playing") {
        const oldState = this.#state.value;
        this.#state.next(state);

        if (oldState == "paused" && state == "playing") {
            this.#lastPlayTime = performance.now();
        } else if (oldState == "playing" && state == "paused") {
            const delta = Math.floor((performance.now() - this.#lastPlayTime) * timing.TICKS_PER_SECOND / 1000);
            this.#seekheadInitialPosition += delta;
        }
    }

    get state$(): Observable<"paused" | "playing"> {
        return this.#state;
    }

    get saved$(): Observable<boolean> {
        return combineLatest([this.#undoStack, this.#savedHistoryId]).pipe(
            map(([undoStack, id]) => {
                const current = undoStack[undoStack.length - 1];
                return current == null ? id == null : current.id == id;
            }),
        );
    }

    get seekhead(): number {
        if (this.#state.value == "paused") {
            return this.#seekheadInitialPosition;
        } else {
            const delta = Math.floor((performance.now() - this.#lastPlayTime) * timing.TICKS_PER_SECOND / 1000);
            return this.#seekheadInitialPosition + delta;
        }
    }

    set seekhead(value: number) {
        if (this.#state.value == "playing") this.#lastPlayTime = performance.now();
        this.#seekheadInitialPosition = value;
        this.#seekheadPositionChanged.next();
    }

    stop(): void {
        if (this.#state.value == "paused") return;
        this.#state.next("paused");
    }

    /**
     * Edit the scene and commit to history stack.
     *
     * If there is no changes (the updater is an identity unary function), there will be no entry pushed to history
     * stack.
     *
     * @param updater Scene updater
     * @param name Name of the edit history
     * @returns History entry
     */
    editScene(updater: (scene: scene.Scene) => scene.Scene, name?: string): HistoryEntry | null {
        const id = crypto.randomUUID();
        const prevState = this.#scene.value;
        const nextState = updater(this.#scene.value);

        if (prevState == nextState) return null;

        const entry = { id, name, prevState, nextState };
        this.#scene.next(nextState);
        this.#undoStack.next([...this.#undoStack.value, entry]);
        if (this.#redoStack.value.length != 0) this.#redoStack.next([]);
        return entry;
    }

    /**
     * Revert the scene to target history entry.
     *
     * @param target Target history entry to revert
     */
    revertScene(target: HistoryEntry): void {
        const undoToIndex = this.#undoStack.value.findIndex((e) => e.id == target.id);
        const redoToIndex = this.#redoStack.value.findIndex((e) => e.id == target.id);

        if (undoToIndex != -1) {
            const movingEntries = this.#undoStack.value.slice(undoToIndex);
            this.#undoStack.next(this.#undoStack.value.slice(0, undoToIndex));
            this.#redoStack.next([...movingEntries, ...this.#redoStack.value]);
            this.#scene.next(target.prevState);
        } else if (redoToIndex != -1) {
            const movingEntries = this.#redoStack.value.slice(0, redoToIndex + 1);
            this.#redoStack.next(this.#redoStack.value.slice(redoToIndex + 1));
            this.#undoStack.next([...this.#undoStack.value, ...movingEntries]);
            this.#scene.next(target.nextState);
        }
    }

    async saveScene(): Promise<void> {
        const currentHistoryId = this.undoStack[this.undoStack.length - 1]?.id ?? null;
        if (currentHistoryId == this.#savedHistoryId.value) return;
        await this.project.projectRoot.writeJson(this.path, this.#scene.value);
        this.#savedHistoryId.next(currentHistoryId);
    }
}

export interface HistoryEntry {
    readonly id: string;
    readonly name?: string;
    readonly prevState: scene.Scene;
    readonly nextState: scene.Scene;
}

export function getEditorSession(): EditorSession {
    return getContext(EditorSession);
}

const defaultWorkspace: WorkspaceState<PanelState> = {
    tilingRoot: "root",
    tilingNodes: {
        "root": {
            type: "leaf",
            selectedId: "explorer",
            tabs: [
                {
                    tabId: "explorer",
                    content: {
                        type: "explorer",
                    },
                },
            ],
        },
    },
    floating: [],
};
