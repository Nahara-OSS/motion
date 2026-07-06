import type { Environment } from "./environment.ts";
import type { ObjectGlobalRenderer, ObjectLocalRenderer, ObjectType } from "./object.ts";
import type { RenderTarget } from "./target.ts";
import { NumberType, type Value } from "./value.ts";

export interface Scene {
    readonly timeline: SceneTimeline;
    readonly editor: SceneEditor;
    readonly graphics: SceneGraphics;
    readonly audio: SceneAudio;
    readonly markers: readonly Marker[];
    readonly compositions: readonly Composition[];
    readonly objects: Readonly<Record<string, SceneObject>>;
    readonly rootIds: readonly string[];
}

/**
 * Scene timeline information.
 */
export interface SceneTimeline {
    /**
     * Start tick for the timelin.
     *
     * The start tick is inclusive, which means the playback range of the scene is `startTick <= tick < endTick`.
     */
    readonly startTick: number;

    /**
     * End tick for the timeline.
     *
     * The end tick is exclusive, which means the playback range of the scene is `startTick <= tick < endTick`.
     */
    readonly endTick: number;

    /**
     * Tick rate of the timeline.
     *
     * The tick rate must be exactly `176400` for now. The tick rate constant can be found in `timing.TICKS_PER_SECOND`.
     */
    readonly tickRate: number;
}

/**
 * Scene editor information.
 */
export interface SceneEditor {
    /**
     * ID of currently active composition.
     *
     * The editor can only display exactly one composition at a time.
     */
    readonly activeCompositionId: string;
}

/**
 * Scene graphics environment information.
 */
export interface SceneGraphics {
    /**
     * Size of the scene.
     *
     * This field measures the size of the framebuffer that the objects can draw into. If the scene have no fixed size,
     * the size can be `null`.
     *
     * Scenes without size are typically used outside the editor, like in games or interactive websites for example.
     */
    readonly size: { readonly width: number; readonly height: number } | null;

    /**
     * Frame rate of the scene.
     *
     * The frame rate should be aligned to the tick rate of the scene's timeline (that is, the tick rate must be
     * divisible to the frame rate). Alignment is important to make sure the audio is synchronized with the video.
     */
    readonly fps: number;
}

/**
 * Scene audio environment information.
 */
export interface SceneAudio {
    /**
     * Sample rate of the audio.
     *
     * The sample rate should be aligned to the tick rate of the scene's timeline (that is, the sample rate must be
     * divisible to the tick rate or vice versa).  Alignment is important to make sure the audio is synchronized with
     * the video.
     */
    readonly sampleRate: number;
}

export interface Marker {
    readonly markerId: string;
    readonly label: string | null;
    readonly startTick: number;
    readonly endTick: number;
}

/**
 * Composition information.
 *
 * By definition in user manual, a composition stores the visibility state of the objects. In reality, the visibility
 * states are stored inside objects as a map from composition ID to the state (`Record<string, boolean>`). If the map
 * does not contains the composition ID, just assume the object is toggled on for that composition.
 */
export interface Composition {
    readonly compositionId: string;
    readonly label: string | null;
}

export interface SceneObject {
    readonly typeId: string;
    readonly reference: string | null;
    readonly label: string | null;
    readonly startTick: number;
    readonly endTick: number;
    readonly visibility: Readonly<Record<string, boolean>>;
    readonly state: unknown;
    readonly childrenIds: readonly string[];
}

export interface RenderOptions {
    readonly scene: Scene;
    readonly currentTick: number;
    readonly composition: string;
    readonly target: RenderTarget;
}

export class SceneRenderer implements Disposable {
    static readonly VARIABLE_TIME = "time";

    #globalRenderers = new Map<ObjectType<unknown, unknown>, ObjectGlobalRenderer<unknown, unknown>>();
    #localRenderers = new Map<string, ObjectLocalRenderer<unknown, unknown>>();

    constructor(
        public readonly environment: Environment,
        public readonly typeRegistry: (typeId: string) => ObjectType<unknown, unknown> | null,
        public readonly globalRegistry: (name: string) => Value<unknown> | null,
    ) {}

    async render(options: RenderOptions): Promise<void> {
        let rendering = true;
        const renderedTypes = new Set<ObjectType<unknown, unknown>>();
        const removingTypes = new Set(this.#globalRenderers.keys());
        const renderedObjects = new Set<string>();
        const removingObjects = new Set<string>();

        const render = async (objectId: string, target: RenderTarget, references: Record<string, Value<unknown>>) => {
            const object = options.scene.objects[objectId];
            if (object == null) return;

            const type = this.typeRegistry(object.typeId);
            if (type == null) return;

            const globalRenderer = this.#globalRenderers.get(type) ?? await type.createGlobalRenderer(this.environment);
            if (globalRenderer == null) return;

            this.#globalRenderers.set(type, globalRenderer);
            removingTypes.delete(type);

            if (!renderedTypes.has(type)) {
                renderedTypes.add(type);
                if (globalRenderer.begin != null) await globalRenderer.begin();
            }

            const inVisibleRange = options.currentTick >= object.startTick && options.currentTick < object.endTick;
            const localRenderer = this.#localRenderers.get(objectId) ?? await globalRenderer.createLocalRenderer();
            this.#localRenderers.set(objectId, localRenderer);
            removingObjects.delete(objectId);

            if ((object.visibility[options.composition] ?? true) && inVisibleRange) {
                if (!renderedObjects.has(objectId)) {
                    renderedObjects.add(objectId);
                    if (localRenderer.begin != null) await localRenderer.begin(object.state);
                }

                await localRenderer.render({
                    state: object.state,
                    handle: objectId,
                    tickRate: options.scene.timeline.tickRate,
                    target: target,

                    lookupVariable: (name) => {
                        if (name == SceneRenderer.VARIABLE_TIME) {
                            const time = options.currentTick / options.scene.timeline.tickRate;
                            return NumberType.of(time) as Value<unknown>;
                        }

                        return this.globalRegistry(name);
                    },

                    lookupReference: (name) => {
                        return references[name] ?? null;
                    },

                    // deno-lint-ignore no-explicit-any
                    renderChildren: async (options = {} as any) => {
                        if (!rendering) throw new Error("Attempt to render children outside rendering scope");

                        const childrenTarget = options.target ?? target;
                        let refs = references;

                        if (type.valueType != null && object.reference != null) {
                            if (options.value == null) {
                                throw new Error("Object declared `valueType` but not providing `value`");
                            }

                            refs = {
                                ...refs,
                                [object.reference]: type.valueType.of(options.value),
                            };
                        }

                        for (const id of object.childrenIds) {
                            await render(id, childrenTarget, refs);
                        }
                    },
                });
            }
        };

        for (const id of options.scene.rootIds) {
            await render(id, options.target, {});
        }

        for (const id of renderedObjects) {
            const renderer = this.#localRenderers.get(id);
            if (renderer?.end != null) await renderer.end(options.scene.objects[id]);
        }

        for (const type of renderedTypes) {
            const renderer = this.#globalRenderers.get(type);
            if (renderer?.end != null) await renderer.end();
        }

        for (const id of removingObjects) {
            const renderer = this.#localRenderers.get(id);
            if (renderer?.destroy != null) renderer.destroy();
            this.#localRenderers.delete(id);
        }

        for (const type of removingTypes) {
            const renderer = this.#globalRenderers.get(type);
            if (renderer?.destroy != null) renderer.destroy();
            this.#globalRenderers.delete(type);
        }

        rendering = false;
    }

    [Symbol.dispose](): void {
        this.#localRenderers.forEach((renderer) => renderer.destroy != null ? renderer.destroy() : null);
        this.#globalRenderers.forEach((renderer) => renderer.destroy != null ? renderer.destroy() : null);
        this.#localRenderers.clear();
        this.#globalRenderers.clear();
    }
}
