declare function showDirectoryPicker(options?: ShowDirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;

interface ShowDirectoryPickerOptions {
    readonly id?: string;
    readonly mode?: "read" | "readwrite";
    readonly startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
}
