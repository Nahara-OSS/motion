import { filter, map, Observable, Subject } from "rxjs";
import { contentType } from "@std/media-types";

export class RootFolder {
    readonly events: Observable<FolderEvent>;

    private constructor(public readonly type: RootFolderType) {
        if (type.type == "root") {
            this.events = type.subject;
        } else {
            this.events = type.parent.events.pipe(
                map<FolderEvent, FolderEvent | null>((event) => {
                    if (event.type == "update" || event.type == "remove") {
                        const suffix = cutPrefix(type.path, event.path);
                        if (suffix == null) return null;
                        return { ...event, path: suffix };
                    }

                    return event;
                }),
                filter((v) => v != null),
            );
        }
    }

    /**
     * Obtain the name of root.
     *
     * This will be used as project name.
     */
    get rootName(): string {
        return this.type.type == "root" ? this.type.root.name : this.type.path[this.type.path.length - 1];
    }

    /**
     * Create a new true root from director handle.
     *
     * @param root Directory handle of true root
     * @returns New root folder view
     */
    static createRoot(root: FileSystemDirectoryHandle): RootFolder {
        return new RootFolder({ type: "root", root, subject: new Subject() });
    }

    /**
     * Derive new virtual root from given path.
     *
     * Deriving new virtual root is useful for isolating the project folder from app's root folder. It also emit
     * relevant events if the parent made some changes that matches the watching folder of virtual root.
     *
     * @param path Path to virtual root
     * @returns New root folder view
     */
    deriveToNewRoot(path: readonly string[]): RootFolder {
        return new RootFolder({ type: "derived", parent: this, path });
    }

    /**
     * List all files inside a folder.
     *
     * @param path Path to folder
     * @returns List of files in the folder
     */
    async ls(path: readonly string[]): Promise<FolderItem[]> {
        if (this.type.type == "derived") return await this.type.parent.ls([...this.type.path, ...path]);
        let currentFolder = this.type.root;
        const content: FolderItem[] = [];

        for (const part of path) {
            currentFolder = await currentFolder.getDirectoryHandle(part);
        }

        for await (const [name, handle] of currentFolder.entries()) {
            content.push({
                name,
                type: handle.kind == "file" ? "file" : "folder",
                contentType: handle.kind == "file" ? contentTypeOf(name) : "",
            });
        }

        return content;
    }

    /**
     * Track the content of the folder as observable.
     *
     * @param path Path to folder
     * @returns Observable
     */
    trackContentAsObservable(path: readonly string[]): Observable<FolderItem[]> {
        return new Observable((subscriber) => {
            const pull = () => {
                this.ls(path)
                    .then((content) => subscriber.next(content))
                    .catch((e) => subscriber.error(e));
            };

            pull();

            subscriber.add(this.events.subscribe((event) => {
                if ((event.type == "update" || event.type == "remove") && cutPrefix(path, event.path) == null) return;
                pull();
            }));
        });
    }

    /**
     * Obtain file in this root from given path.
     *
     * @param path Path to file
     * @returns File
     */
    async get(path: readonly string[]): Promise<File> {
        if (this.type.type == "derived") return await this.type.parent.get([...this.type.path, ...path]);
        let currentFolder = this.type.root;
        for (const part of path.slice(0, path.length - 1)) currentFolder = await currentFolder.getDirectoryHandle(part);
        const fileHandle = await currentFolder.getFileHandle(path[path.length - 1]);
        return await fileHandle.getFile();
    }

    async #openWrite(path: readonly string[]): Promise<FileSystemWritableFileStream> {
        if (this.type.type == "derived") return await this.type.parent.#openWrite([...this.type.path, ...path]);
        let currentFolder = this.type.root;

        for (const part of path.slice(0, path.length - 1)) {
            currentFolder = await currentFolder.getDirectoryHandle(part, { create: true });
        }

        const fileHandle = await currentFolder.getFileHandle(path[path.length - 1], { create: true });
        return await fileHandle.createWritable();
    }

    /**
     * Write data to file.
     *
     * @param path Path to file
     * @param data Data to write
     */
    async write(path: readonly string[], data: FileSystemWriteChunkType): Promise<void> {
        const stream = await this.#openWrite(path);
        await stream.write(data);
        await stream.close();
        if (this.type.type == "root") this.type.subject.next({ type: "update", path });
    }

    async readJson<T>(path: readonly string[]): Promise<T> {
        const file = await this.get(path);
        return JSON.parse(await file.text());
    }

    async writeJson<T>(path: readonly string[], data: T): Promise<void> {
        return await this.write(path, JSON.stringify(data));
    }
}

function cutPrefix(prefix: readonly string[], full: readonly string[]): readonly string[] | null {
    if (prefix.length > full.length || prefix.some((part, i) => part != full[i])) return null;
    return full.slice(prefix.length);
}

function contentTypeOf(filename: string): string {
    const split = filename.split(".");
    if (split.length == 1) return "application/octet-stream";

    const extname = split[split.length - 1];
    const mime = contentType("." + extname);
    return mime != null ? mime : `application/x-extension-${extname}`;
}

type RootFolderType =
    | { type: "root"; root: FileSystemDirectoryHandle; subject: Subject<FolderEvent> }
    | { type: "derived"; parent: RootFolder; path: readonly string[] };

export interface FolderItem {
    readonly name: string;
    readonly type: "folder" | "file";
    readonly contentType: string;
}

/**
 * - `refresh`: Folder and files might have been modified and need to refresh.
 */
export type FolderEvent =
    | { type: "refresh" }
    | { type: "update"; path: readonly string[] }
    | { type: "remove"; path: readonly string[] };
