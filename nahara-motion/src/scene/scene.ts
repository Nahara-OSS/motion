import { RenderContext } from "../render/context.js";
import { Vec2 } from "../types.js";
import { IObjectContainer, objects, SceneObjectInfo, SerializableSceneObjectInfo } from "./object.js";

export interface IScene extends IObjectContainer {
    readonly uid: string;
    readonly metadata: SceneMetadata;
    readonly serializable: any;

    /**
     * Render a single frame at time provided by the context. This will render the scene at `(0; 0)` and with scene size
     * provided in render context as container size (rather than defined size in the scene metadata).
     * 
     * If you want to move the scene, you can use `ctx.translate()`.
     * @param context The rendering context.
     */
    renderFrame(context: RenderContext): void;
}

export interface SceneMetadata {
    /**
     * The display name of the scene.
     */
    name?: string;

    /**
     * The size of the scene that will be displayed in editor's viewport. This does not always mean the scene will
     * always be displayed with given size; the actual size is determined by `RenderContext`.
     */
    size: Vec2;
}

interface SerializableScene {
    uid: string;
    metadata: SceneMetadata;
    root: SerializableSceneObjectInfo[];
}

export class Scene implements IScene {
    root: SceneObjectInfo[] = [];

    constructor(
        public readonly uid: string,
        public metadata: SceneMetadata
    ) {}

    get objectsCount(): number { return this.root.length; }

    at(index: number): SceneObjectInfo {
        if (index < 0 || index >= this.root.length)
            throw new Error(`Index out of bounds: ${index} (out of ${this.root.length})`);
        return this.root[index];
    }

    indexOf(object: SceneObjectInfo): number {
        return this.root.indexOf(object);
    }

    add(index: number, object: SceneObjectInfo): void;
    add(object: SceneObjectInfo): number;
    add(a: number | SceneObjectInfo, b?: SceneObjectInfo): number | void {
        if (typeof a == "number") {
            if (a < 0 || a > this.root.length)
                throw new Error(`Index out of bounds: ${a} (out of ${this.root.length})`);
            this.root.splice(a, 0, b!);
            return this.indexOf(b!);
        }

        return this.root.push(a) - 1;
    }

    remove(index: number): SceneObjectInfo;
    remove(object: SceneObjectInfo): void;
    remove(a: number | SceneObjectInfo): void | SceneObjectInfo {
        if (typeof a == "number") {
            if (a < 0 || a >= this.root.length)
                throw new Error(`Index out of bounds: ${a} (out of ${this.root.length})`);
            return this.root.splice(a, 1)[0];
        }

        const index = this.indexOf(a);
        if (index == -1) throw new Error(`Object does not belong to scene`);
        this.remove(index);
    }

    collect(time: number): SceneObjectInfo[] {
        return this.root.filter(obj => time >= obj.timeStart && time < obj.timeEnd);
    }

    [Symbol.iterator](): Iterator<SceneObjectInfo, any, undefined> {
        return this.root[Symbol.iterator]();
    }

    renderFrame(context: RenderContext): void {
        let objs = this.collect(context.time);
        objs.forEach(obj => obj.object.render(context));
    }

    get serializable(): SerializableScene {
        return {
            uid: this.uid,
            metadata: structuredClone(this.metadata),
            root: this.root.map(objects.toSerializable)
        };
    }

    static fromSerializable(data: any): Scene {
        return this._fromSerializable(data as SerializableScene);
    }

    static _fromSerializable(data: SerializableScene): Scene {
        let scene = new Scene(data.uid, structuredClone(data.metadata));
        scene.root = data.root.map(objects.fromSerializable).filter(obj => !!obj);
        return scene;
    }
}