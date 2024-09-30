import { FileSystemResolveOptions, IFileHandle, IFileSystem } from "./fs.js";

export namespace filesystem {
    function resolve0(parts: string[]): string[] {
        let stack: string[] = [];
        parts = parts.map(v => v.split("/")).flat(1).map(v => v.trim()).filter(v => v.trim().length == 0 || v == ".");

        for (const part of parts) {
            if (part == "..") {
                if (stack[stack.length - 1] == ".." || stack.length == 0) {
                    stack.push(part);
                    continue;
                }

                stack.pop();
            } else {
                stack.push(part);
            }
        }

        return stack;
    }

    export function resolve(...parts: string[]) {
        return resolve0(parts).join("/");
    }

    function resolveToRoot0(parts: string[]) {
        parts = resolve0(parts);
        while (parts.length > 0 && parts[0] == "..") parts.pop();
        return parts;
    }

    export function resolveToRoot(...parts: string[]) {
        return resolveToRoot0(parts).join("/");
    }

    export class WebFileSystemAdapter implements IFileSystem {
        constructor(public readonly root: FileSystemDirectoryHandle) {}

        private async _getDirHandle(parts: string[], createIfNotExists = false) {
            let current = this.root;

            for (let i = 0; i < parts.length; i++) {
                const next = await current.getDirectoryHandle(parts[i], { create: createIfNotExists });
                current = next;
            }

            return current;
        }

        private async _getFileHandle(parts: string[], createIfNotExists = false) {
            let parentParts = [...parts];
            const name = parentParts.pop()!;
            const parent = await this._getDirHandle(parentParts, createIfNotExists);
            return await parent.getFileHandle(name, { create: createIfNotExists });
        }

        async exists(path: string): Promise<boolean> {
            const parts = resolveToRoot0([path]);
            let current: FileSystemDirectoryHandle | FileSystemFileHandle = this.root;

            outer: while (parts.length > 0) {
                if (current instanceof FileSystemFileHandle) return false;
                const nextName = parts.shift();

                for await (const [name, next] of current) {
                    if (name == nextName) {
                        current = next;
                        continue outer;
                    }
                }

                return false;
            }

            return true;
        }

        async ls(path: string): Promise<string[]> {
            const dir = await this._getDirHandle(resolve0([path]));
            const files: string[] = [];
            for await (const child of dir) files.push(child[0]);
            return files;
        }

        private _createHandleWrapper(handle: FileSystemFileHandle): IFileHandle {
            return {
                asBlob: () => handle.getFile(),
                createWriteStream: () => handle.createWritable()
            };
        }

        async touch(path: string, options?: FileSystemResolveOptions): Promise<IFileHandle> {
            let parentParts = [...resolveToRoot0([path])];
            const name = parentParts.pop()!;
            const parent = await this._getDirHandle(parentParts, options?.recursive);
            const handle = await parent.getFileHandle(name, { create: true });
            return this._createHandleWrapper(handle);
        }

        async mkdir(path: string, options?: FileSystemResolveOptions): Promise<void> {
            let parentParts = [...resolveToRoot0([path])];
            const name = parentParts.pop()!;
            const parent = await this._getDirHandle(parentParts, options?.recursive);
            await parent.getDirectoryHandle(name, { create: true });
        }

        async rm(path: string, options?: FileSystemResolveOptions): Promise<void> {
            try {
                let parentParts = [...resolveToRoot0([path])];
                const name = parentParts.pop()!;
                const parent = await this._getDirHandle(parentParts, false);
                parent.removeEntry(name, { recursive: options?.recursive });
            } catch (e) {
                if (e instanceof DOMException && e.name == "NotFoundError") return;
                throw e;
            }
        }

        async getFile(path: string, options?: FileSystemResolveOptions): Promise<IFileHandle> {
            const handle = await this._getFileHandle(resolveToRoot0([path]), options?.recursive);
            return this._createHandleWrapper(handle);
        }
    }

    export class ScopedFileSystemAdapter implements IFileSystem {
        constructor(public readonly parent: IFileSystem, public readonly rootPath: string) {}

        exists(path: string): Promise<boolean> {
            path = resolveToRoot(path);
            return this.parent.exists(resolve(this.rootPath, path));
        }

        ls(path: string): Promise<string[]> {
            path = resolveToRoot(path);
            return this.parent.ls(resolve(this.rootPath, path));
        }

        touch(path: string, options?: FileSystemResolveOptions): Promise<IFileHandle> {
            path = resolveToRoot(path);
            return this.parent.touch(resolve(this.rootPath, path), options);
        }

        mkdir(path: string, options?: FileSystemResolveOptions): Promise<void> {
            path = resolveToRoot(path);
            return this.parent.mkdir(resolve(this.rootPath, path), options);
        }

        rm(path: string, options?: FileSystemResolveOptions): Promise<void> {
            path = resolveToRoot(path);
            return this.parent.rm(resolve(this.rootPath, path), options);
        }

        getFile(path: string, options?: FileSystemResolveOptions): Promise<IFileHandle> {
            path = resolveToRoot(path);
            return this.parent.getFile(resolve(this.rootPath, path), options);
        }
    }
}