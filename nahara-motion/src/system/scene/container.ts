import { RenderContext } from "../../render/context.js";
import { IAnimatable, Animatable } from "../../scene/animation.js";
import { ISceneObjectWithPositionalData, ISceneObjectWithSizeData, ISceneContainerObject, SceneObjectInfo, ISceneObjectType, objects, ISceneObjectWithRotationData } from "../../scene/object.js";
import { AnimatableObjectProperty } from "../../scene/property.js";

export class Container implements ISceneObjectWithPositionalData, ISceneObjectWithSizeData, ISceneObjectWithRotationData, ISceneContainerObject {
    isContainer: true = true;
    isPositional: true = true;
    isSizable: true = true;
    isRotatable: true = true;
    isViewportEditable: true = true;

    x: IAnimatable<number> = Animatable.scalar("x");
    y: IAnimatable<number> = Animatable.scalar("y");
    width: IAnimatable<number> = Animatable.scalar("width", 100);
    height: IAnimatable<number> = Animatable.scalar("height", 100);
    rotation: IAnimatable<number> = Animatable.scalar("rotation");
    children: SceneObjectInfo[] = [];

    properties = [
        new AnimatableObjectProperty(this.x),
        new AnimatableObjectProperty(this.y),
        new AnimatableObjectProperty(this.width),
        new AnimatableObjectProperty(this.height),
        new AnimatableObjectProperty(this.rotation),
    ];

    render(context: RenderContext): void {
        const x = this.x.get(context.time);
        const y = this.y.get(context.time);
        const width = this.width.get(context.time);
        const height = this.height.get(context.time);
        const rotation = this.rotation.get(context.time);

        let newContext: RenderContext = {
            canvas: context.canvas,
            containerSize: { x: width, y: height },
            time: context.time,
            timeDelta: context.timeDelta
        };

        context.canvas.translate(x + width / 2, y + height / 2);
        context.canvas.rotate(rotation * Math.PI / 180);
        context.canvas.translate(-(width / 2), -(height / 2));

        let objs = this.collect(context.time);
        objs.forEach(obj => obj.object.render(newContext));

        context.canvas.translate(width / 2, height / 2);
        context.canvas.rotate(-(rotation * Math.PI / 180));
        context.canvas.translate(-(x + width / 2), -(y + height / 2));
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
        rotation: any,
        children: any[]
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
            out.rotation.fromSerializable(data.rotation);
            out.children = data.children.map(objects.fromSerializable).filter(v => !!v);
            return out;
        },
        toSerializable(object) {
            return {
                x: object.x.serializable,
                y: object.y.serializable,
                width: object.width.serializable,
                height: object.height.serializable,
                rotation: object.rotation.serializable,
                children: object.children.map(objects.toSerializable)
            };
        },
    };
}