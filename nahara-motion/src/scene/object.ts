import { addons } from "../addon/addon.js";
import { registries } from "../addon/registries.js";
import { RenderContext } from "../render/context.js";
import { Color, Vec2 } from "../types.js";
import { utils } from "../utils.js";
import { Animatable, IAnimatable } from "./animation.js";

export interface ISceneObject {
    readonly properties: (IAnimatable<any> | IObjectProperty<any>)[];

    /**
     * Render the object to the context, using current transformation. The context transformation before and after this
     * function is called must be the same. The scene object may choose to create a new `RenderContext` with different
     * data if transformation to context inputs is required (such as changing the output size in container object).
     * @param context The rendering context.
     */
    render(context: RenderContext): void;
}

/**
 * A simple property of the object. This was meant for values that can't be interpolated, like `string` for example. As
 * such, these properties can't be animated.
 */
export interface IObjectProperty<T> {
    readonly isSimple: true;
    readonly translationKey: string;
    get(): T;
    set(value: T): void;
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

/**
 * A scene object that allows making adjustments in the viewport. If you think your object can be adjusted in viewport,
 * such as moving or resizing, consider implementing subinterface of this instead!
 */
export interface ISceneObjectWithViewportEditing extends ISceneObject {
    readonly isViewportEditable: true;
    readonly isPositional?: boolean;
    readonly isSizable?: boolean;

    /**
     * The scale of this scene object's editable nodes in 2D preview viewport. The default scale is `(1; 1)`. The value
     * for this should remain constant.
     */
    readonly viewportEditingScale?: Vec2;
}

/**
 * A scene object with positional data. Any object that's implementing this interface will have position controls
 * visible in the viewport, allowing user to easily edit the object's position by just grabbing it.
 */
export interface ISceneObjectWithPositionalData extends ISceneObjectWithViewportEditing {
    readonly isPositional: true;
    readonly x: IAnimatable<number>;
    readonly y: IAnimatable<number>;
}

/**
 * A scene object with size data. Any object that's implementing this interface will have size controls visible in the
 * viewport, allowing user to easily edit the object's size by just grabbing the handles.
 */
export interface ISceneObjectWithSizeData extends ISceneObjectWithViewportEditing {
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

    export class Box2D implements ISceneObjectWithPositionalData, ISceneObjectWithSizeData {
        isViewportEditable: true = true;
        isPositional: true = true;
        isSizable: true = true;
        x: IAnimatable<number> = Animatable.scalar("x");
        y: IAnimatable<number> = Animatable.scalar("y");
        width: IAnimatable<number> = Animatable.scalar("width", 100);
        height: IAnimatable<number> = Animatable.scalar("height", 100);
        color: IAnimatable<Color> = Animatable.color("color", { model: "rgba", r: 255, g: 255, b: 255, a: 255 });

        properties = [
            this.x,
            this.y,
            this.width,
            this.height,
            this.color
        ];

        render(context: RenderContext): void {
            const x = this.x.get(context.time);
            const y = this.y.get(context.time);
            const width = this.width.get(context.time);
            const height = this.height.get(context.time);
            const color = this.color.get(context.time);
            context.canvas.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 255})`;
            context.canvas.fillRect(x, y, width, height);
        }

        static readonly Type: ISceneObjectType<Box2D, {
            x: any,
            y: any,
            width: any,
            height: any,
            color: any
        }> = {
            class: Box2D,
            name: "Box",
            category: "Graphics",
            createNew: () => new Box2D(),
            fromSerializable(data) {
                const out = new Box2D();
                out.x.fromSerializable(data.x);
                out.y.fromSerializable(data.y);
                out.width.fromSerializable(data.width);
                out.height.fromSerializable(data.height);
                out.color.fromSerializable(data.color)
                return out;
            },
            toSerializable(object) {
                return {
                    x: object.x.serializable,
                    y: object.y.serializable,
                    width: object.width.serializable,
                    height: object.height.serializable,
                    color: object.color.serializable
                };
            },
        };
    }

    export class Text2D implements ISceneObjectWithPositionalData {
        isPositional: true = true;
        isViewportEditable: true = true;
        x: IAnimatable<number> = Animatable.scalar("x");
        y: IAnimatable<number> = Animatable.scalar("y");
        scaleX: IAnimatable<number> = Animatable.scalar("scaleX", 1);
        scaleY: IAnimatable<number> = Animatable.scalar("scaleY", 1);
        content: string = "Sample Text";
        font: string = "Inter";
        cjkVertical: boolean = false;
        size: IAnimatable<number> = Animatable.scalar("size", 14);
        color: IAnimatable<Color> = Animatable.color("color");

        properties = [
            this.x,
            this.y,
            this.scaleX,
            this.scaleY,
            {
                isSimple: true,
                translationKey: "content",
                get: () => this.content,
                set: newContent => this.content = newContent
            } as IObjectProperty<string>,
            {
                isSimple: true,
                translationKey: "font",
                get: () => this.font,
                set: newFont => this.font = newFont
            } as IObjectProperty<string>,
            {
                isSimple: true,
                translationKey: "cjkVertical",
                get: () => this.cjkVertical,
                set: newState => this.cjkVertical = newState
            } as IObjectProperty<boolean>,
            this.size,
            this.color
        ];

        render(context: RenderContext): void {
            const x = this.x.get(context.time);
            const y = this.y.get(context.time);
            const scaleX = this.scaleX.get(context.time);
            const scaleY = this.scaleY.get(context.time);
            const size = this.size.get(context.time);
            const color = this.color.get(context.time);
            context.canvas.font = `${size}px ${this.font}`;
            context.canvas.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 255})`;
            context.canvas.save();
            context.canvas.translate(x, y);
            context.canvas.scale(scaleX, scaleY);

            if (this.cjkVertical) {
                // Special vertical rendering for CJKV characters
                // TODO handle full stop (。) properly

                for (const char of this.content) {
                    context.canvas.fillText(char, 0, 0);
                    context.canvas.translate(0, size);
                }
            } else {
                context.canvas.scale(scaleX, scaleY);
                context.canvas.fillText(this.content, 0, 0);
            }

            context.canvas.restore();
        }

        static readonly Type: ISceneObjectType<Text2D, {
            x: any,
            y: any,
            scaleX: any,
            scaleY: any,
            content: string,
            font: string,
            cjkVertical: boolean,
            size: any,
            color: any
        }> = {
            class: Text2D,
            name: "Text",
            category: "Graphics",
            createNew: () => new Text2D(),
            fromSerializable(data) {
                const out = new Text2D();
                out.x.fromSerializable(data.x);
                out.y.fromSerializable(data.y);
                out.scaleX.fromSerializable(data.scaleX);
                out.scaleY.fromSerializable(data.scaleY);
                out.size.fromSerializable(data.size);
                out.color.fromSerializable(data.color);
                out.content = data.content;
                out.font = data.font;
                out.cjkVertical = data.cjkVertical;
                return out;
            },
            toSerializable(object) {
                return {
                    x: object.x.serializable,
                    y: object.y.serializable,
                    scaleX: object.scaleX.serializable,
                    scaleY: object.scaleY.serializable,
                    content: object.content,
                    font: object.font,
                    cjkVertical: object.cjkVertical,
                    size: object.size.serializable,
                    color: object.color.serializable
                };
            },
        };
    }

    export class Container implements ISceneObjectWithPositionalData, ISceneObjectWithSizeData, ISceneContainerObject {
        isContainer: true = true;
        isPositional: true = true;
        isSizable: true = true;
        isViewportEditable: true = true;

        x: IAnimatable<number> = Animatable.scalar("x");
        y: IAnimatable<number> = Animatable.scalar("y");
        width: IAnimatable<number> = Animatable.scalar("width", 100);
        height: IAnimatable<number> = Animatable.scalar("height", 100);
        children: SceneObjectInfo[] = [];

        properties = [
            this.x,
            this.y,
            this.width,
            this.height
        ];

        render(context: RenderContext): void {
            const x = this.x.get(context.time);
            const y = this.y.get(context.time);
            const width = this.width.get(context.time);
            const height = this.height.get(context.time);

            let newContext: RenderContext = {
                canvas: context.canvas,
                containerSize: { x: width, y: height },
                time: context.time,
                timeDelta: context.timeDelta
            };

            context.canvas.translate(x, y);
            let objs = this.collect(context.time);
            objs.forEach(obj => obj.object.render(newContext));
            context.canvas.translate(-x, -y);
        }

        get objectsCount(): number { return this.children.length; }

        at(index: number): SceneObjectInfo {
            if (index < 0 || index >= this.children.length)
                throw new Error(`Index out of bounds: ${index} (out of ${this.children.length})`);
            return this.children[index];
        }
    
        indexOf(object: SceneObjectInfo): number {
            return this.children.indexOf(object);
        }

        add(index: number, object: SceneObjectInfo): void;
        add(object: SceneObjectInfo): number;
        add(a: number | SceneObjectInfo, b?: SceneObjectInfo): number | void {
            if (typeof a == "number") {
                if (a < 0 || a > this.children.length)
                    throw new Error(`Index out of bounds: ${a} (out of ${this.children.length})`);
                this.children.splice(a, 0, b!);
                return this.indexOf(b!);
            }
    
            return this.children.push(a) - 1;
        }

        remove(index: number): SceneObjectInfo;
        remove(object: SceneObjectInfo): void;
        remove(a: number | SceneObjectInfo): void | SceneObjectInfo {
            if (typeof a == "number") {
                if (a < 0 || a >= this.children.length)
                    throw new Error(`Index out of bounds: ${a} (out of ${this.children.length})`);
                return this.children.splice(a, 1)[0];
            }
    
            const index = this.indexOf(a);
            if (index == -1) throw new Error(`Object does not belong to scene`);
            this.remove(index);
        }
    
        collect(time: number): SceneObjectInfo[] {
            return this.children.filter(obj => time >= obj.timeStart && time < obj.timeEnd);
        }
    
        [Symbol.iterator](): Iterator<SceneObjectInfo, any, undefined> {
            return this.children[Symbol.iterator]();
        }

        static readonly Type: ISceneObjectType<Container, {
            x: any,
            y: any,
            width: any,
            height: any,
            children: SerializableSceneObjectInfo[]
        }> = {
            class: Container,
            name: "Container",
            category: "Grouping",
            createNew: () => new Container(),
            fromSerializable(data) {
                const out = new Container();
                out.x.fromSerializable(data.x);
                out.y.fromSerializable(data.y);
                out.width.fromSerializable(data.width);
                out.height.fromSerializable(data.height);
                out.children = data.children.map(fromSerializable).filter(v => !!v);
                return out;
            },
            toSerializable(object) {
                return {
                    x: object.x.serializable,
                    y: object.y.serializable,
                    width: object.width.serializable,
                    height: object.height.serializable,
                    children: object.children.map(toSerializable)
                };
            },
        };
    }

    export class Data1D implements ISceneObject {
        data: IAnimatable<number> = Animatable.scalar("data");
        properties = [this.data];
        render(): void {}

        static readonly Type: ISceneObjectType<Data1D, { data: any }> = {
            class: Data1D,
            name: "Data (1D)",
            description: "One-dimensional data. For baking data to keyframes and sharing it to other objects.",
            category: "Data",
            createNew: () => new Data1D(),
            fromSerializable(data) {
                const out = new Data1D();
                out.data.fromSerializable(data.data);
                return out;
            },
            toSerializable(object) {
                return {
                    data: object.data.serializable
                };
            },
        };
    }

    export class Data2D implements ISceneObject {
        data: IAnimatable<Vec2> = Animatable.vec2("data");
        properties = [this.data];
        render(): void {}

        static readonly Type: ISceneObjectType<Data2D, { data: any }> = {
            class: Data2D,
            name: "Data (2D)",
            description: "Two-dimensional data. For baking data to keyframes and sharing it to other objects.",
            category: "Data",
            createNew: () => new Data2D(),
            fromSerializable(data) {
                const out = new Data2D();
                out.data.fromSerializable(data.data);
                return out;
            },
            toSerializable(object) {
                return {
                    data: object.data.serializable
                };
            },
        };
    }
}