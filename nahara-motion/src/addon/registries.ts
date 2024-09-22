import { ISceneObjectType } from "../scene/object.js";
import { IRegistry, Registry } from "./registry.js";

export namespace registries {
    export const Objects: IRegistry<ISceneObjectType> = new Registry("objects");

    export const AllRegistries: ArrayLike<IRegistry<any>> & Iterable<IRegistry<any>> = [
        Objects
    ];
}