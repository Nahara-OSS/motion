export interface WorkspaceState<T> {
    readonly tilingNodes: Readonly<Record<string, TilingNode<T>>>;
    readonly tilingRoot: string;
    readonly floating: readonly FloatingWindow<T>[];
}

export type TilingNode<T> = TilingSplitNode | TilingLeafNode<T>;

export interface TilingSplitNode {
    readonly type: "split";
    readonly dir: "row" | "column" | "row-reverse" | "column-reverse";
    readonly primarySize: number;
    readonly primaryId: string;
    readonly secondaryId: string;
}

export interface TilingLeafNode<T> extends WindowContent<T> {
    readonly type: "leaf";
}

export interface FloatingWindow<T> extends WindowContent<T> {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export interface WindowContent<T> {
    readonly selectedId: string;
    readonly tabs: readonly Tab<T>[];
}

export interface Tab<T> {
    readonly tabId: string;
    readonly content: T;
}
