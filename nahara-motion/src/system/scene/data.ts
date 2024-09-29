import { IAnimatable, Animatable } from "../../scene/animation.js";
import { ISceneObject, ISceneObjectType } from "../../scene/object.js";
import { AnimatableObjectProperty } from "../../scene/property.js";
import { Vec2 } from "../../types.js";

export class Data1D implements ISceneObject {
    data: IAnimatable<number> = Animatable.scalar("data");
    properties = [new AnimatableObjectProperty(this.data)];
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