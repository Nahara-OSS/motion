import * as helper from "@nahara/motion-helper";

export enum CommandIds {
    AppSettings = "app.settings",
    AppQuit = "app.quit",

    NewProject = "file.newProject",
    OpenProject = "file.openProject",
    SaveProject = "file.saveProject",
    SaveProjectAs = "file.saveProjectAs",
    CloseProject = "file.closeProject",

    Undo = "edit.undo",
    Redo = "edit.redo",
    Cancel = "edit.cancel",

    ToolPrimary = "tool.primary",
    SelectTool = "tool.select",
    ShapeTool = "tool.shape",
    RectShapeTool = "tool.shape.rect",
    CircleShapeTool = "tool.shape.circle",
    DrawTool = "tool.draw",
    PenDrawTool = "tool.draw.pen",
    FreehandDrawTool = "tool.draw.freehand",

    Play = "playback.play",
    Pause = "playback.pause",
    Stop = "playback.stop",
    PlayOrPause = "playback.playOrPause",
    PlayOrStop = "playback.playOrStop",

    OnlineManual = "help.onlineManual",
    Tutorials = "help.tutorials",
    DiagnosticsInfo = "help.diagnosticsInfo",
    BugReport = "help.bugReport",
    SourceCode = "help.sourceCode",
    AboutMotion = "help.aboutMotion",
    AboutNahara = "help.aboutNahara",
    AboutLicense = "help.aboutLicense",
}

export interface Command {
}

export interface EditorState {
    readonly allCommands: Readonly<Record<string, Command>>;
    readonly handleCommands: readonly string[];
    readonly registries: Readonly<Record<string, Registry>>;
}

export const EditorState: { readonly Initial: EditorState } = {
    Initial: {
        allCommands: {
            [CommandIds.AppQuit]: {},
            [CommandIds.NewProject]: {},
            [CommandIds.OpenProject]: {},
            [CommandIds.SaveProject]: {},
            [CommandIds.SaveProjectAs]: {},
            [CommandIds.CloseProject]: {},
            [CommandIds.Undo]: {},
            [CommandIds.Redo]: {},
            [CommandIds.Cancel]: {},
            [CommandIds.SelectTool]: {},
            [CommandIds.ShapeTool]: {},
            [CommandIds.RectShapeTool]: {},
            [CommandIds.CircleShapeTool]: {},
            [CommandIds.Play]: {},
            [CommandIds.Pause]: {},
            [CommandIds.Stop]: {},
            [CommandIds.PlayOrPause]: {},
            [CommandIds.PlayOrStop]: {},
            [CommandIds.OnlineManual]: {},
            [CommandIds.Tutorials]: {},
            [CommandIds.BugReport]: {},
            [CommandIds.SourceCode]: {},
            [CommandIds.AboutMotion]: {},
            [CommandIds.AboutNahara]: {},
            [CommandIds.AboutLicense]: {},
        },
        handleCommands: [
            CommandIds.AppQuit,
            CommandIds.NewProject,
            CommandIds.OpenProject,
            CommandIds.OnlineManual,
            CommandIds.Tutorials,
            CommandIds.BugReport,
            CommandIds.SourceCode,
            CommandIds.AboutMotion,
            CommandIds.AboutNahara,
            CommandIds.AboutLicense,
        ],
        registries: {},
    },
};

export interface Registry {
    readonly name: string | null;
    readonly description: string | null;
}

export interface Settings {
    readonly language: string;
    readonly menus: readonly Menu[];
    readonly quickActions: readonly string[];
    readonly keyBinds: Readonly<Partial<Record<string, readonly KeyCombination[]>>>;
}

export interface Menu {
    readonly label: string;
    readonly content: readonly MenuItem[];
}

export type MenuItem =
    | MenuChildItem
    | MenuCommandItem
    | MenuSeparatorItem
    | MenuSpecialItem;

export enum MenuItemKind {
    Menu = "menu",
    Command = "command",
    Separator = "separator",
    Special = "special",
}

export interface MenuChildItem extends Menu {
    readonly kind: MenuItemKind.Menu;
}

export interface MenuCommandItem {
    readonly kind: MenuItemKind.Command;
    readonly commandId: string;
}

export interface MenuSeparatorItem {
    readonly kind: MenuItemKind.Separator;
}

export interface MenuSpecialItem {
    readonly kind: MenuItemKind.Special;
    readonly type: MenuSpecialType;
}

export enum MenuSpecialType {
    Projects = "projects",
    Workspaces = "workspaces",
}

export interface KeyCombination {
    readonly key: Key;
    readonly ctrl: boolean;
    readonly alt: boolean;
    readonly shift: boolean;
}

export enum Key {
    // Pointers
    // TODO: Implement touch gestures (maybe?)
    MousePrimary = "mouse.primary",
    MouseSecondary = "mouse.secondary",
    MouseTernary = "mouse.ternary",
    StylusPen = "stylus.pen",
    StylusEraser = "stylus.eraser",

    // Keyboard
    A = "key.a",
    B = "key.b",
    C = "key.c",
    D = "key.d",
    E = "key.e",
    F = "key.f",
    G = "key.g",
    H = "key.h",
    I = "key.i",
    J = "key.j",
    K = "key.k",
    L = "key.l",
    M = "key.m",
    N = "key.n",
    O = "key.o",
    P = "key.p",
    Q = "key.q",
    R = "key.r",
    S = "key.s",
    T = "key.t",
    U = "key.u",
    V = "key.v",
    W = "key.w",
    X = "key.x",
    Y = "key.y",
    Z = "key.z",
    Digit1 = "key.1",
    Digit2 = "key.2",
    Digit3 = "key.3",
    Digit4 = "key.4",
    Digit5 = "key.5",
    Digit6 = "key.6",
    Digit7 = "key.7",
    Digit8 = "key.8",
    Digit9 = "key.9",
    Spacebar = "key.spacebar",
    F1 = "key.f1",
    F2 = "key.f2",
    F3 = "key.f3",
    F4 = "key.f4",
    F5 = "key.f5",
    F6 = "key.f6",
    F7 = "key.f7",
    F8 = "key.f8",
    F9 = "key.f9",
    F10 = "key.f10",
    F11 = "key.f11",
    F12 = "key.f12",
    Num1 = "numpad.1",
    Num2 = "numpad.2",
    Num3 = "numpad.3",
    Num4 = "numpad.4",
    Num5 = "numpad.5",
    Num6 = "numpad.6",
    Num7 = "numpad.7",
    Num8 = "numpad.8",
    Num9 = "numpad.9",
}

export const Settings: { readonly Initial: Settings } = {
    Initial: {
        language: "en-us",
        menus: [
            {
                label: "Nahara's Motion",
                content: [
                    { kind: MenuItemKind.Command, commandId: CommandIds.AppSettings },
                    { kind: MenuItemKind.Command, commandId: CommandIds.AppQuit },
                ],
            },
            {
                label: "File",
                content: [
                    { kind: MenuItemKind.Command, commandId: CommandIds.NewProject },
                    { kind: MenuItemKind.Command, commandId: CommandIds.OpenProject },
                    { kind: MenuItemKind.Command, commandId: CommandIds.SaveProject },
                    { kind: MenuItemKind.Command, commandId: CommandIds.SaveProjectAs },
                    { kind: MenuItemKind.Special, type: MenuSpecialType.Projects },
                    { kind: MenuItemKind.Command, commandId: CommandIds.CloseProject },
                ],
            },
            {
                label: "Edit",
                content: [
                    { kind: MenuItemKind.Command, commandId: CommandIds.Undo },
                    { kind: MenuItemKind.Command, commandId: CommandIds.Redo },
                    { kind: MenuItemKind.Command, commandId: CommandIds.Cancel },
                ],
            },
            {
                label: "Tools",
                content: [
                    { kind: MenuItemKind.Command, commandId: CommandIds.SelectTool },
                    {
                        kind: MenuItemKind.Menu,
                        label: "Shapes",
                        content: [
                            { kind: MenuItemKind.Command, commandId: CommandIds.RectShapeTool },
                            { kind: MenuItemKind.Command, commandId: CommandIds.CircleShapeTool },
                        ],
                    },
                    {
                        kind: MenuItemKind.Menu,
                        label: "Draw",
                        content: [
                            { kind: MenuItemKind.Command, commandId: CommandIds.PenDrawTool },
                            { kind: MenuItemKind.Command, commandId: CommandIds.FreehandDrawTool },
                        ],
                    },
                ],
            },
            {
                label: "Playback",
                content: [
                    { kind: MenuItemKind.Command, commandId: CommandIds.Play },
                    { kind: MenuItemKind.Command, commandId: CommandIds.Pause },
                    { kind: MenuItemKind.Command, commandId: CommandIds.Stop },
                    { kind: MenuItemKind.Command, commandId: CommandIds.PlayOrPause },
                    { kind: MenuItemKind.Command, commandId: CommandIds.PlayOrStop },
                ],
            },
            {
                label: "Help",
                content: [
                    { kind: MenuItemKind.Command, commandId: CommandIds.OnlineManual },
                    { kind: MenuItemKind.Command, commandId: CommandIds.Tutorials },
                    { kind: MenuItemKind.Separator },
                    { kind: MenuItemKind.Command, commandId: CommandIds.DiagnosticsInfo },
                    { kind: MenuItemKind.Command, commandId: CommandIds.BugReport },
                    { kind: MenuItemKind.Separator },
                    { kind: MenuItemKind.Command, commandId: CommandIds.AboutMotion },
                    { kind: MenuItemKind.Command, commandId: CommandIds.AboutNahara },
                    { kind: MenuItemKind.Command, commandId: CommandIds.AboutLicense },
                    { kind: MenuItemKind.Command, commandId: CommandIds.SourceCode },
                ],
            },
        ],
        quickActions: [
            CommandIds.PlayOrPause,
        ],
        keyBinds: {
            [CommandIds.OnlineManual]: [{ key: Key.F1, ctrl: false, alt: false, shift: false }],
            [CommandIds.NewProject]: [{ key: Key.N, ctrl: true, alt: false, shift: false }],
            [CommandIds.OpenProject]: [{ key: Key.O, ctrl: true, alt: false, shift: false }],
            [CommandIds.SaveProject]: [{ key: Key.S, ctrl: true, alt: false, shift: false }],
            [CommandIds.SaveProjectAs]: [{ key: Key.S, ctrl: true, alt: false, shift: true }],
            [CommandIds.ToolPrimary]: [{ key: Key.MousePrimary, ctrl: false, alt: false, shift: false }],
            [CommandIds.SelectTool]: [{ key: Key.Digit1, ctrl: false, alt: false, shift: false }],
            [CommandIds.ShapeTool]: [{ key: Key.Digit2, ctrl: false, alt: false, shift: false }],
            [CommandIds.DrawTool]: [{ key: Key.Digit3, ctrl: false, alt: false, shift: false }],
            [CommandIds.PenDrawTool]: [{ key: Key.P, ctrl: false, alt: false, shift: false }],
            [CommandIds.PlayOrPause]: [{ key: Key.Spacebar, ctrl: false, alt: false, shift: false }],
            [CommandIds.PlayOrStop]: [{ key: Key.Spacebar, ctrl: false, alt: false, shift: true }],
            [CommandIds.Undo]: [{ key: Key.Z, ctrl: true, alt: false, shift: false }],
            [CommandIds.Redo]: [{ key: Key.Z, ctrl: true, alt: false, shift: true }],
        },
    },
};

export interface ProjectState {
    readonly handleCommands: readonly string[];
    readonly name: string | null;
    readonly saved: boolean;
    readonly history: History;
    readonly toolbox: Toolbox;
    readonly elements: Readonly<Record<string, Element>>;
    readonly dependencies: Readonly<Record<string, ProjectDependency>>;
    readonly assets: Readonly<Record<string, ProjectAsset>>;
}

export interface History {
    readonly current: string;
    readonly undoStack: readonly string[];
    readonly redoStack: readonly string[];
}

export interface Toolbox {
    readonly current: Tool;
    readonly lastShape: Tool.RectShape | Tool.CircleShape;
    readonly lastDraw: Tool.PenDraw | Tool.FreehandDraw;
}

export enum Tool {
    Select,
    RectShape,
    CircleShape,
    PenDraw,
    FreehandDraw,
}

export type Element =
    | TypeElement
    | FunctionElement
    | ComponentElement;

export enum ElementKind {
    Type,
    Struct,
    Variant,
    Function,
    Component,
}

export interface TypeElement {
    readonly kind: ElementKind.Type | ElementKind.Struct | ElementKind.Variant;
    readonly name: string | null;
    readonly description: string | null;
    readonly subtype: string | null;
    readonly ordinal: number;
}

export interface FunctionElement {
    readonly kind: ElementKind.Function;
    readonly name: string | null;
    readonly description: string | null;
    readonly subtype: string | null;
    readonly ordinal: number;
}

export interface ComponentElement {
    readonly kind: ElementKind.Component;
    readonly name: string | null;
    readonly description: string | null;
    readonly subtype: string | null;
    readonly ordinal: number;
    readonly cameras: readonly helper.annotation.Camera[];
}

export interface ProjectDependency {
    readonly name: string | null;
    readonly status: DependencyStatus;
}

export enum DependencyStatus {
    Ok,
    Missing,
    CompileError,
}

export type ProjectAsset =
    | ProjectModuleAsset
    | ProjectFolderAsset
    | ProjectFileAsset;

export enum ProjectAssetKind {
    Module,
    Folder,
    File,
}

export interface ProjectModuleAsset {
    readonly kind: ProjectAssetKind.Module;
}

export interface ProjectFolderAsset {
    readonly kind: ProjectAssetKind.Folder;
    readonly content: Readonly<Record<string, ProjectAsset>>;
}

export interface ProjectFileAsset {
    readonly kind: ProjectAssetKind.File;
    readonly content: Blob;
}

export interface SceneState {
    readonly sceneId: string;
    readonly cameraId: string | null;
}

export type Selection =
    | ProjectSelection
    | ElementSelection;

export enum SelectionTarget {
    Project,
    Element,
}

export interface ProjectSelection {
    readonly target: SelectionTarget.Project;
}

export interface ElementSelection {
    readonly target: SelectionTarget.Element;
    readonly elementIds: readonly string[];
}

export const Selection: { readonly Initial: Selection } = {
    Initial: { target: SelectionTarget.Project },
};

export type MessageMap = Readonly<Record<string, unknown>>;
export type Message<Map extends MessageMap> = {
    [Type in keyof Map]: { readonly messageType: Type } & Map[Type];
}[keyof Map];

export interface TypedMessageChannel<SendMap extends MessageMap, ReceiveMap extends MessageMap> extends Disposable {
    start(): void;
    send(message: Message<SendMap>): void;
    listen(callback: (message: Message<ReceiveMap>) => void): () => void;
    close(): void;
}

export const TypedMessageChannel: {
    self<SendMap extends MessageMap, ReceiveMap extends MessageMap>(
        options?: TypedMessageChannelOptions<SendMap, ReceiveMap>,
    ): TypedMessageChannel<SendMap, ReceiveMap>;

    wrap<SendMap extends MessageMap, ReceiveMap extends MessageMap>(
        port: MessagePort | Worker,
        options?: TypedMessageChannelOptions<SendMap, ReceiveMap>,
    ): TypedMessageChannel<SendMap, ReceiveMap>;
} = {
    self: (options = {}) => ({
        send: (message) => {
            const transferablesFn = options.transferables?.[message.messageType];
            const transfer = transferablesFn != null ? transferablesFn(message) : [];
            postMessage(message, { transfer });
        },

        listen: (callback) => {
            const listener = (e: MessageEvent) => callback(e.data);
            addEventListener("message", listener);
            return () => removeEventListener("message", listener);
        },

        start: () => {},
        close: () => {},
        [Symbol.dispose]: () => {},
    }),

    wrap: (port, options = {}) => ({
        send: (message) => {
            const transferablesFn = options.transferables?.[message.messageType];
            const transfer = transferablesFn != null ? transferablesFn(message) : [];
            port.postMessage(message, { transfer });
        },

        listen: (callback) => {
            // deno-lint-ignore no-explicit-any
            const listener: any = (e: MessageEvent) => callback(e.data);
            port.addEventListener("message", listener);
            return () => port.removeEventListener("message", listener);
        },

        start: () => {
            if (port instanceof MessagePort) port.start();
        },

        close: () => port instanceof MessagePort ? port.close() : port.terminate(),
        [Symbol.dispose]: () => port instanceof MessagePort ? port.close() : port.terminate(),
    }),
};

export interface TypedMessageChannelOptions<SendMap extends MessageMap, ReceiveMap extends MessageMap> {
    readonly transferables?: { [Type in keyof SendMap]?: (message: SendMap[Type]) => Transferable[] };
}

export interface CommandTriggerData {
    readonly commandId: string;
    readonly state: CommandState;
    readonly extra: ExtraActionData;
}

export enum CommandState {
    OneShot,
    Down,
    Hold,
    Up,
}

export interface ExtraActionData {
    /**
     * User is hovering their (primary) pointer (e.g. mouse or stylus) inside viewport
     *
     * The priority to find the primary pointer is determined based on following order:
     *
     * - The pointer that triggered the command;
     * - First stylus being held down;
     * - First stylus hovering in viewport;
     * - First finger being held down;
     * - First mouse pointer being held down;
     * - First mouse pointer hovering in viewport.
     */
    readonly viewport?: {
        readonly px: number;
        readonly py: number;
    };
}

export interface EditorMessages {
    uiChannel: TypedMessageChannel<EditorMessages["ui"], EditorMessages["editor"]>;
    editorChannel: TypedMessageChannel<EditorMessages["editor"], EditorMessages["ui"]>;

    ui: {
        "command": CommandTriggerData;

        // deno-lint-ignore ban-types
        "load-settings": {};

        "save-settings": {
            readonly settings: Settings;
        };
    };

    editor: {
        "state": {
            readonly state: EditorState;
        };

        "settings": {
            readonly settings: Settings;
        };

        "open-url": {
            readonly url: string;
        };

        "open-project": {
            readonly port: MessagePort;
            readonly project: ProjectState;
        };
    };
}

export const EditorMessages: {
    createUIChannel(worker: Worker): EditorMessages["uiChannel"];
    createEditorChannel(): EditorMessages["editorChannel"];
} = {
    createUIChannel: (worker) => (TypedMessageChannel.wrap(worker, {
        transferables: {},
    })),

    createEditorChannel: () => (TypedMessageChannel.self({
        transferables: {
            "open-project": ({ port }) => [port],
        },
    })),
};

export interface ProjectMessages {
    uiChannel: TypedMessageChannel<ProjectMessages["ui"], ProjectMessages["editor"]>;
    editorChannel: TypedMessageChannel<ProjectMessages["editor"], ProjectMessages["ui"]>;

    ui: {
        "command": CommandTriggerData;

        "attach-canvas": {
            readonly canvas: OffscreenCanvas;
            readonly width: number;
            readonly height: number;
        };

        "resize-canvas": {
            readonly width: number;
            readonly height: number;
        };

        // deno-lint-ignore ban-types
        "detach-canvas": {};

        "open-scene": {
            readonly sceneId: string | null;
        };

        "activate-camera": {
            readonly cameraId: string | null;
        };

        // deno-lint-ignore ban-types
        "select-project": {};

        "select-element": {
            readonly elementIds: readonly string[];
        };

        "edit": {
            [Type in keyof EditCommands]: {
                readonly editType: Type;
                readonly label: string;
            } & EditCommands[Type];
        }[keyof EditCommands];

        "queue-edit": {
            [Type in keyof EditCommands]: { readonly editType: Type } & EditCommands[Type];
        }[keyof EditCommands];

        "commit-edit": {
            readonly label: string;
        };

        "undo": {
            readonly count: number;
        };

        "redo": {
            readonly count: number;
        };
    };

    editor: {
        "project-state": {
            readonly state: ProjectState;
        };

        "scene-state": {
            readonly state: SceneState | null;
        };

        "selection": {
            readonly selection: Selection;
        };

        // deno-lint-ignore ban-types
        "close": {};
    };
}

export const ProjectMessages: {
    createUIChannel(port: MessagePort): ProjectMessages["uiChannel"];
    createEditorChannel(port: MessagePort): ProjectMessages["editorChannel"];
} = {
    createUIChannel: (port) => (TypedMessageChannel.wrap(port, {
        transferables: {
            "attach-canvas": ({ canvas }) => [canvas],
        },
    })),

    createEditorChannel: (port) => (TypedMessageChannel.wrap(port, {
        transferables: {},
    })),
};

export interface EditCommands {
    "element-name": {
        readonly elementId: string;
        readonly name: string;
    };

    "element-description": {
        readonly elementId: string;
        readonly description: string;
    };

    "camera-name": {
        readonly sceneId: string;
        readonly cameraId: string;
        readonly name: string;
    };

    "camera-width": {
        readonly sceneId: string;
        readonly cameraId: string;
        readonly width: number;
    };

    "camera-height": {
        readonly sceneId: string;
        readonly cameraId: string;
        readonly height: number;
    };

    "camera-background": {
        readonly sceneId: string;
        readonly cameraId: string;
        readonly background: readonly [r: number, g: number, b: number] | null;
    };

    "delete-camera": {
        readonly sceneId: string;
        readonly cameraId: string;
    };
}
