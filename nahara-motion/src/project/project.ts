import { IScene, Scene, SceneMetadata } from "../scene/scene.js";
import { utils } from "../utils.js";

export interface IProject {
    /**
     * User-defined project metadata.
     */
    metadata: ProjectMetadata;

    readonly scenes: Iterable<IScene>;
    newScene(metadata: SceneMetadata): IScene;
    deleteScene(scene: IScene): void;
    getScene(uid: string): IScene | undefined;
}

export interface ProjectMetadata {
    name?: string;
    author?: string;
    description?: string;
    license?: string;

    /**
     * Total working time since last reset, counted in milliseconds. Counting rules:
     * - If user made a change when there is no changes before, or time since last change is longer than 60 seconds, it
     * will be counted as 5 seconds of work time.
     * - If user made a change within 60 seconds after previous change, the time differences will be counted towards the
     * counter.
     * - This counter is not to be used as proof of work, as it can easily be spoofed.
     */
    workingTime?: number;
}

export class Project implements IProject {
    scenesMap = new Map<string, Scene>();

    constructor(public metadata: ProjectMetadata) {}

    get scenes() { return this.scenesMap.values(); }

    newScene(metadata: SceneMetadata): IScene {
        const uid = utils.randomUid();
        const out = new Scene(uid, structuredClone(metadata));
        this.scenesMap.set(uid, out);
        return out;
    }

    deleteScene(scene: IScene): void {
        this.scenesMap.delete(scene.uid);
    }

    getScene(uid: string): IScene | undefined {
        return this.scenesMap.get(uid);
    }
}