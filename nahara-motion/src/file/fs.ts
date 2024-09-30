export interface IFileSystem {
    exists(path: string): Promise<boolean>;
    ls(path: string): Promise<string[]>;
    touch(path: string, options?: FileSystemResolveOptions): Promise<IFileHandle>;
    mkdir(path: string, options?: FileSystemResolveOptions): Promise<void>;
    rm(path: string, options?: FileSystemResolveOptions): Promise<void>;
    getFile(path: string, options?: FileSystemResolveOptions): Promise<IFileHandle>;
}

export interface FileSystemResolveOptions {
    recursive?: boolean;
}

export interface FileStats {
    // symbolic links will be ignored for now.
    readonly isDir: boolean;
    readonly isFile: boolean;
}

export interface IFileHandle {
    asBlob(): Promise<Blob>;
    createWriteStream(): Promise<WritableStream>;
}