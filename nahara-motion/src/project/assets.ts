import { IScene, Scene } from "../scene/scene.js";

export interface IProjectAsset<T> {
    readonly manager: IProjectAssetsManager;
    readonly path: string;

    /**
     * The asset data. If the asset is loaded, the property will have a value that is neither `null` nor `undefined`.
     * If the asset is still being loaded, or the asset does not exists, the property will be `undefined`. Main use case
     * for this is rendering on every frame without blocking the rendering procedure (eg: display placeholder image
     * while loading).
     */
    readonly immediate?: T;
    readonly loaded: boolean;
    readonly existed: boolean;

    /**
     * The loading task as `Promise<T>`. This will resolves if loaded successfully, or reject if the asset does not
     * exists.
     */
    readonly loadingTask: Promise<T>;

    /**
     * Reload the asset, which turns `loadingTask` into unresolved task, unset the `immediate` value, set `loaded` and
     * `existed` to false and add loading task to asset load tasks queue in assets manager.
     */
    reload(): void;
}

export interface AssetLoaderContext {
    asDirectory(options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>;
    asFile(options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>;
}

export interface AssetType<T> {
    loadAsset(ctx: AssetLoaderContext): Promise<T>;
    saveAsset(data: T, ctx: AssetLoaderContext): Promise<void>;
}

export interface IProjectAssetsManager {
    /**
     * Get the asset from this assets manager. If the asset is already loaded and cached, it will return the asset with
     * `loaded` being `true` and `immediate` having value, otherwise you can either loop until `immediate` have value,
     * or wait until `loadingTask` is resolved.
     * @param path The path to asset under project's assets root.
     * @param type The type of asset to load.
     */
    get<T>(path: string, type: AssetType<T>): IProjectAsset<T>;

    /**
     * Save the asset to this assets manager. This will replace the value of `immediate` for `IProjectAsset<T>`, change
     * `loaded` and `existed` to `true and replace `loadingTask` with resolved `Promise<T>`. If the `loadingTask` is
     * still being resolved, it will wait for that to finish (either resolved or rejected) before actually saving the
     * asset.
     * @param path The path to save the asset under project's assets root.
     * @param type The type of asset to save.
     * @param data The asset data to save.
     */
    save<T>(path: string, type: AssetType<T>, data: T): Promise<void>;

    /**
     * Unload the asset, detaching `IProjectAsset<T>` that was previously tied to the given path.
     * @param path The path to asset to unload.
     */
    unload(path: string): void;
}

export class SimpleProjectAssetsManager implements IProjectAssetsManager {
    cache: Map<string, SimpleProjectAsset<any>> = new Map();

    constructor(public readonly assetsRoot: FileSystemDirectoryHandle) {}

    get<T>(path: string, type: AssetType<T>): IProjectAsset<T> {
        let result = this.cache.get(path);

        if (!result) {
            this.cache.set(path, result = new SimpleProjectAsset(this, path, type));
            result.reload();
        }

        if (result.loaded && !result.existed) result.reload();
        return result;
    }

    async save<T>(path: string, type: AssetType<T>, data: T): Promise<void> {
        let result = this.cache.get(path);
        if (result) await (result.loadingTask.then(() => {}, () => {}));

        const pathSegments = pathToSegments(path);
        if (pathSegments.length == 0) throw new Error("Can't save assets root as asset itself");

        let parent: FileSystemDirectoryHandle = this.assetsRoot;
        for (let i = 0; i < pathSegments.length - 1; i++) {
            const segment = pathSegments[i];
            parent = await parent.getDirectoryHandle(segment, { create: true });
        }

        await type.saveAsset(data, {
            asDirectory: o => parent.getDirectoryHandle(pathSegments[pathSegments.length - 1], o),
            asFile: o => parent.getFileHandle(pathSegments[pathSegments.length - 1], o)
        });

        if (!result) {
            this.cache.set(path, result = new SimpleProjectAsset(this, path, type));
            result.immediate = data;
            result.loaded = true;
            result.existed = true;
        }
    }

    unload(path: string): void {
        const cached = this.cache.get(path);

        if (cached) {
            cached.detached = true;
            this.cache.delete(path);
        }
    }
}

class SimpleProjectAsset<T> implements IProjectAsset<T> {
    immediate?: T | undefined;
    loaded: boolean = false;
    existed: boolean = false;
    loadingTask: Promise<T> = Promise.reject();
    detached = false;

    constructor(
        public readonly manager: SimpleProjectAssetsManager,
        public readonly path: string,
        public readonly type: AssetType<T>
    ) {}

    reload(): void {
        if (this.detached) return;

        this.immediate = undefined;
        this.loaded = false;
        this.existed = false;
        this.loadingTask = (async () => {
            const pathSegments = pathToSegments(this.path);

            if (pathSegments.length == 0) {
                this.immediate = undefined;
                this.loaded = true;
                this.existed = false;
                throw new Error("Can't load assets root as asset itself");
            }

            let parent: FileSystemDirectoryHandle = this.manager.assetsRoot;
            for (let i = 0; i < pathSegments.length - 1; i++) {
                const segment = pathSegments[i];
                parent = await parent.getDirectoryHandle(segment, { create: true });
            }

            let result = await this.type.loadAsset({
                asDirectory: o => parent.getDirectoryHandle(pathSegments[pathSegments.length - 1], o),
                asFile: o => parent.getFileHandle(pathSegments[pathSegments.length - 1], o)
            });

            this.immediate = result;
            this.loaded = true;
            this.existed = true;
            return result;
        })();
    }
}

function pathToSegments(path: string): string[] {
    let input = path.split("/").map(v => v.trim()).filter(v => v.length > 0 && v != ".");
    let output: string[] = [];

    for (const part of input) {
        if (part == "..") {
            if (output.length == 0 || output[output.length - 1] == "..") output.push(part);
            else output.pop();
        } else {
            output.push(part);
        }
    }

    return output;
}