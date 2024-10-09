/**
 * Represent an editor UI layout that is customizable by user. A typical editor layout includes the tiling layout info
 * and serializable tab states. However, plugins are not supposed to modify the layout; the info is up to editor
 * implementation to decide.
 *
 * The layout can be serialized to JSON, allowing plugins to easily save them into a file.
 */
export interface IEditorLayout {}

export interface EditorLayoutEntry {
    name: string;
    layout: IEditorLayout;
}

export interface IEditorLayoutManager {
    current: IEditorLayout;
    readonly allLayouts: ArrayLike<EditorLayoutEntry> | Iterable<EditorLayoutEntry>;

    add(name: string, layout: IEditorLayout): EditorLayoutEntry;
    remove(entry: EditorLayoutEntry): void;
}