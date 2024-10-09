import { IScene, Scene, SceneMetadata } from "../scene/scene.js";
import { utils } from "../utils.js";
import { IProjectAssetsManager, SimpleProjectAssetsManager } from "./assets.js";

export interface IProject {
    readonly root: FileSystemDirectoryHandle;
    readonly metadata: ProjectMetadata;
    readonly assets: IProjectAssetsManager;

    /**
     * Save the metadata of this project. Any modifications made to the project's metadata are not saved by default.
     * The underlying implementation will write the metadata to a file called `project.metadata.json`.
     */
    saveMetadata(): Promise<void>;

    // Scenes management
    // Initially wanted to store scenes as assets, but ended up limiting to 1 scene per editor instance.
    listAllScenes(): Promise<[string, SceneMetadata | undefined][]>;
    loadScene(uid: string): Promise<IScene>;
    saveScene(scene: IScene): Promise<void>;
    newScene(metadata: SceneMetadata): Promise<IScene>;
    deleteScene(uid: string): Promise<void>;
}

export interface ProjectMetadata {
    name?: string;
    author?: string;
    description?: string;
}

export class SimpleProject implements IProject {
    constructor(
        public readonly root: FileSystemDirectoryHandle,
        public metadata: ProjectMetadata,
        public readonly assets: IProjectAssetsManager,
        public readonly scenes: FileSystemDirectoryHandle
    ) {}

    async saveMetadata(): Promise<void> {
        const handle = await this.root.getFileHandle("project.metadata.json", { create: true });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(this.metadata));
        await writable.close();
    }

    async listAllScenes(): Promise<[string, SceneMetadata | undefined][]> {
        const metadataHandle = await this.scenes.getFileHandle("scenes.metadata.json", { create: true });
        const metadataBlob = await metadataHandle.getFile();
        const metadataStore: Record<string, SceneMetadata> = metadataBlob.size > 0 ? JSON.parse(await metadataBlob.text()) : {};

        let out: [string, SceneMetadata | undefined][] = [];

        for await (const [fileName, handle] of this.scenes) {
            if (handle.kind != "file" || fileName == "scenes.metadata.json") continue;
            out.push([fileName, metadataStore[fileName]]);
        }

        return out;
    }

    async loadScene(uid: string): Promise<IScene> {
        const handle = await this.scenes.getFileHandle(uid);
        const blob = await handle.getFile();
        return Scene.fromSerializable(JSON.parse(await blob.text()));
    }

    async saveScene(scene: IScene): Promise<void> {
        const handle = await this.scenes.getFileHandle(scene.uid, { create: true });
        const writable = await handle.createWritable({ keepExistingData: false });
        await writable.write(JSON.stringify(scene.serializable));
        await writable.close();

        const metadataHandle = await this.scenes.getFileHandle("scenes.metadata.json", { create: true });
        const metadataBlob = await metadataHandle.getFile();
        const metadataStore: Record<string, SceneMetadata> = metadataBlob.size > 0 ? JSON.parse(await metadataBlob.text()) : {};
        metadataStore[scene.uid] = scene.metadata;
        const metadataStream = await metadataHandle.createWritable({ keepExistingData: false });
        await metadataStream.write(JSON.stringify(metadataStore));
        await metadataStream.close();
    }

    async newScene(metadata: SceneMetadata): Promise<IScene> {
        const uid = utils.randomUid() + ".json";
        const scene = new Scene(uid, metadata);
        await this.saveScene(scene);
        return scene;
    }

    async deleteScene(uid: string): Promise<void> {
        await this.scenes.removeEntry(uid);

        const metadataHandle = await this.scenes.getFileHandle("scenes.metadata.json", { create: true });
        const metadataBlob = await metadataHandle.getFile();
        const metadataStore: Record<string, SceneMetadata> = metadataBlob.size > 0 ? JSON.parse(await metadataBlob.text()) : {};
        delete metadataStore[uid];
        const metadataStream = await metadataHandle.createWritable({ keepExistingData: false });
        await metadataStream.write(JSON.stringify(metadataStore));
        await metadataStream.close();
    }

    /**
     * Probe the metadata of the project from project's root directory.
     * @param root The potential root of project.
     * @returns The project metadata, or `undefined` if there is no metadata under given directory.
     */
    static async probeProjectMeta(root: FileSystemDirectoryHandle): Promise<ProjectMetadata | undefined> {
        if (await root.requestPermission({ mode: "readwrite" }) == "denied") throw new Error("Permission denied");

        try {
            const handle = await root.getFileHandle("project.metadata.json");
            const blob = await handle.getFile();
            return JSON.parse(await blob.text()) as ProjectMetadata;
        } catch (e) {
            if (e instanceof DOMException && e.name == "NotFoundError") return undefined;
            throw e;
        }
    }

    /**
     * Try to open the project from directory, which will be used as project root. If there is no project metadata under
     * the root, it will initialize as a new project.
     * @param root The root of the project.
     * @returns The project.
     */
    static async tryOpen(root: FileSystemDirectoryHandle): Promise<SimpleProject> {
        let probedMetadata = await this.probeProjectMeta(root);
        const metadata = probedMetadata ?? { name: root.name };
        const assets = new SimpleProjectAssetsManager(await root.getDirectoryHandle("assets", { create: true }));
        const scenes = await root.getDirectoryHandle("scenes", { create: true });
        const project = new SimpleProject(root, metadata, assets, scenes);

        // Initializing project
        if (!probedMetadata) {
            await project.saveMetadata();
        }

        return project;
    }
}