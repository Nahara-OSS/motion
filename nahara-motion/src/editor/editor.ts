import { IProject } from "../project/project.js";
import { IScene } from "../scene/scene.js";
import { IEditorLayoutManager } from "./layout.js";
import { IPlaybackManager } from "./playback.js";
import { ISelectionsManager } from "./selection.js";

/**
 * Represent an instance of editor.
 */
export interface IEditor {
    readonly layout: IEditorLayoutManager;
    readonly openedProject?: IProject;
    readonly openedScene?: IScene;
    readonly selections: ISelectionsManager;
    readonly playback: IPlaybackManager;

    openProject(project: IProject): void;
    closeProject(): void;

    openScene(scene: IScene): void;
    closeScene(): void;
}