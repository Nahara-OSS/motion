import { IProject } from "../project/project.js";
import { IScene } from "../scene/scene.js";
import { IEditorLayoutManager } from "./layout.js";

/**
 * Represent an instance of editor.
 */
export interface IEditor {
    readonly layout: IEditorLayoutManager;
    readonly openedProject?: IProject;
    readonly openedScene?: IScene;

    openProject(project: IProject): void;
    closeProject(): void;

    openScene(scene: IScene): void;
    closeScene(): void;
}