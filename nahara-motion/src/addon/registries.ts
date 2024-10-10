import { ICommand } from "../editor/command.js";
import { ISceneObjectType } from "../scene/object.js";
import { IRegistry, Registry } from "./registry.js";

export namespace registries {
    export const Commands: IRegistry<ICommand<any>> = new Registry("commands");
    export const Objects: IRegistry<ISceneObjectType> = new Registry("objects");

    export const AllRegistries: ArrayLike<IRegistry<any>> & Iterable<IRegistry<any>> = [
        Commands,
        Objects,
    ];
}