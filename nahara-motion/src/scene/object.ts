import { addons } from "../addon/addon.js";
import { registries } from "../addon/registries.js";
import { RenderContext } from "../render/context.js";
import { Vec2 } from "../types.js";
import { utils } from "../utils.js";
import { IAnimatable } from "./animation.js";
import { IObjectProperty } from "./property.js";

export interface ISceneObject {
    readonly properties: IObjectProperty<any>[];

    /**
     * Render the object to the context, using current transformation. The context transformation before and after this
     * function is called must be the same. The scene object may choose to create a new `RenderContext` with different
     * data if transformation to context inputs is required (such as changing the output size in container object).
     * @param context The rendering context.
     */
    render(context: RenderContext): void;
}

export interface ISceneObjectType<TObject extends ISceneObject = ISceneObject, TSerialize = any> {
    readonly class: { new(...args: any[]): TObject };
    readonly name?: string;
    readonly description?: string;
    readonly category?: string;
    createNew(): TObject;
    fromSerializable(data: TSerialize): TObject;
    toSerializable(object: TObject): TSerialize;
}

export interface SceneObjectInfo {
    uid: string;
    name: string;
    color: string;
    timeStart: number;
    timeEnd: number;
    object: ISceneObject;
}

export interface SerializableSceneObjectInfo {
    uid: string;
    name: string;
    color: string;
    timeStart: number;
    timeEnd: number;
    type: { addonId: string, typeId: string };
    object: any;
}

export interface ISceneObjectWithPositionalData extends ISceneObject {
    readonly isPositional: true;
    readonly x: IAnimatable<number>;
    readonly y: IAnimatable<number>;
}

export interface ISceneObjectWithRotationData extends ISceneObject {
    readonly isRotatable: true;
    readonly rotation: IAnimatable<number>;
}

export interface ISceneObjectWithSizeData extends ISceneObject {
    readonly isSizable: true;
    readonly width: IAnimatable<number>;
    readonly height: IAnimatable<number>;
}

export interface ISceneContainerObject extends ISceneObject, IObjectContainer {
    readonly isContainer: true;
}

/**
 * An interface for objects that can store other scene objects. The object can be a scene or a group object (which
 * groups multiple objects as one). The iterator returned from the container follows the rendering order: the first
 * object will be the rendered first (in UI, it will be displayed at the bottom of scene outliner).
 */
export interface IObjectContainer extends Iterable<SceneObjectInfo> {
    // Array-like operations
    /**
     * Number of objects inside this container.
     */
    readonly objectsCount: number;

    /**
     * Get the scene object from this container. If the index is out of bounds, it will throw an `Error`.
     * @param index The index of the object, starting from 0.
     */
    at(index: number): SceneObjectInfo;

    /**
     * Get the index of the scene object in this container.
     * @param object The scene object.
     * @returns The index of the object in this container, or -1 if it doesn't belong to this container.
     */
    indexOf(object: SceneObjectInfo): number;

    add(index: number, object: SceneObjectInfo): void;
    add(object: SceneObjectInfo): number;

    /**
     * Remove the scene object from this container, based on index. Throws if the index is out of bounds.
     * @param index The index of the object in this container, starting from 0.
     * @returns The scene object that was removed.
     */
    remove(index: number): SceneObjectInfo;

    /**
     * Remove the scene object from this container. Throws if the object does not belong to this container.
     * @param object The scene object in this container.
     */
    remove(object: SceneObjectInfo): void;

    /**
     * Collect all objects that are visible at given time. This does not flatten the container.
     * @param time The time relative to scene's start time (which is 0).
     */
    collect(time: number): SceneObjectInfo[];
}

export namespace objects {
    const logger = new utils.Logger("objects");

    export function getIdFromObject(object: ISceneObject) {
        for (const { addon, id, registerable } of registries.Objects) {
            if (object instanceof registerable.class) return { addon, id };
        }

        return null;
    }

    export function toSerializable(object: SceneObjectInfo): SerializableSceneObjectInfo {
        const id = getIdFromObject(object.object);
        if (!id) throw new Error(`Object type is not registered in registry: ${object.object}`);
        return {
            uid: object.uid,
            name: object.name,
            color: object.color,
            timeStart: object.timeStart,
            timeEnd: object.timeEnd,
            type: {
                addonId: addons.getIdByAddon(id.addon)!,
                typeId: id.id
            },
            object: registries.Objects.get(id.addon, id.id)!.toSerializable(object.object)
        };
    }

    export function fromSerializable(serializable: SerializableSceneObjectInfo): SceneObjectInfo | null {
        const addon = addons.getAddonById(serializable.type.addonId);
        if (!addon) {
            logger.warn(`Missing addon ${serializable.type.addonId} for ${serializable.type.typeId}`);
            return null;
        }

        const type = registries.Objects.get(addon, serializable.type.typeId);
        if (!type) {
            logger.warn(`Addon ${serializable.type.addonId} does not register ${serializable.type.typeId}`);
            return null;
        }

        const object = type.fromSerializable(serializable.object);
        return {
            uid: serializable.uid,
            name: serializable.name,
            color: serializable.color,
            timeStart: serializable.timeStart,
            timeEnd: serializable.timeEnd,
            object
        };
    }

    export function createNew<TObject extends ISceneObject>(
        type: ISceneObjectType<TObject>,
        timeStart: number = 0,
        timeEnd: number = 1000
    ): SceneObjectInfo {
        const object = type.createNew();
        const name = type.name ?? registries.Objects.getId(type)?.id!;
        return {
            uid: utils.randomUid(),
            name,
            color: utils.deriveColorFromString(name),
            timeStart,
            timeEnd,
            object
        };
    }
}