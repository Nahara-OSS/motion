import * as motion from "@nahara/motion";
import * as stdlib from "@nahara/motion-stdlib";
import * as helper from "@nahara/motion-helper";
import * as protocol from "../protocol.ts";
import type * as pkg from "./package.ts";
import { pathSegments } from "./utils.ts";
import { HistoryStack } from "./history.ts";
import { Renderer } from "./renderer.ts";

export interface ProjectCreateOptions {
    readonly name?: string | null;
    readonly channel: protocol.ProjectMessages["editorChannel"];
    readonly source: ProjectSource;

    /**
     * Callback function to handle regular save/auto-save
     *
     * If this callback is not provided, the project will started with unsaved state and the save command will behave
     * like "save as".
     *
     * @param source Project source
     */
    readonly save?: ((source: ProjectSource) => PromiseLike<void>) | null;
}

export class Project implements Disposable {
    #destroyed = false;
    #name: string | null;
    #channel: protocol.ProjectMessages["editorChannel"];
    #history: HistoryStack<EditState>;
    #pending: EditState | null = null;
    #saver: ((source: ProjectSource) => PromiseLike<void>) | null;
    #saved = true;
    #selection = protocol.Selection.Initial;
    #openedSceneId: string | null = null;
    #activeCameraId: string | null = null;
    #tool: protocol.Tool = protocol.Tool.Select;
    #lastShape: protocol.Toolbox["lastShape"] = protocol.Tool.RectShape;
    #lastDraw: protocol.Toolbox["lastDraw"] = protocol.Tool.PenDraw;
    #renderer = Renderer.create({});
    #messageHandler: () => void;
    #viewportChangeHandler: () => void = () => {};

    constructor(options: ProjectCreateOptions) {
        this.#name = options.name ?? null;
        this.#channel = options.channel;
        this.#history = HistoryStack.create("Open project", EditState.create(options.source));
        this.#saver = options.save ?? null;
        this.#messageHandler = this.#channel.listen((message) => this.#handleMessage(message));
        this.#postSetup();
    }

    async #postSetup(): Promise<void> {
        const renderer = await this.#renderer;
        if (this.#destroyed) return;

        console.log(
            `%cworker:project %cRendererer is fully loaded`,
            "color:rebeccapurple;font-weight:bold",
            "",
        );

        this.#viewportChangeHandler = renderer.onViewportChange(() => this.#render());
    }

    get history(): HistoryStack<EditState> {
        return this.#history;
    }

    /**
     * Edit state property is read-only, because it is actually backed by history stack. Use edit() to make immediate
     * changes, or queueEdit() to queue changes and commit() to push the changes to history stack. undo() and redo() may
     * be used to cycle though different history entries.
     */
    get editState(): EditState {
        if (this.#pending != null) return this.#pending;
        return this.#history.current.state;
    }

    get stateProxy(): protocol.ProjectState {
        const handleCommands: string[] = [
            protocol.CommandIds.SaveProject,
            protocol.CommandIds.SaveProjectAs,
            protocol.CommandIds.CloseProject,
            protocol.CommandIds.SelectTool,
            protocol.CommandIds.ShapeTool,
            protocol.CommandIds.RectShapeTool,
            protocol.CommandIds.CircleShapeTool,
            protocol.CommandIds.DrawTool,
            protocol.CommandIds.PenDrawTool,
            protocol.CommandIds.FreehandDrawTool,
        ];

        if (this.#pending != null) handleCommands.push(protocol.CommandIds.Cancel);
        if (this.#history.undoStack.length > 0) handleCommands.push(protocol.CommandIds.Undo);
        if (this.#history.redoStack.length > 0) handleCommands.push(protocol.CommandIds.Redo);

        const { source, elementIdMapping } = this.editState;
        const entry = ProjectSource.entryOf(source);

        const history: protocol.History = {
            current: this.#history.current.label,
            undoStack: this.#history.undoStack.map((e) => e.label),
            redoStack: this.#history.redoStack.map((e) => e.label),
        };

        const toolbox: protocol.Toolbox = {
            current: this.#tool,
            lastShape: this.#lastShape,
            lastDraw: this.#lastDraw,
        };

        const elements: Record<string, protocol.Element> = Object.fromEntries(
            entry.elementTable
                .map<[string, protocol.Element] | null>((element, ordinal) => {
                    if (
                        element.kind != "struct" &&
                        element.kind != "variant" &&
                        element.kind != "function" &&
                        element.kind != "component"
                    ) {
                        return null;
                    }

                    const elementId = elementIdMapping[ordinal];
                    const { name, description, subtype } = element.annotations
                        .map(helper.annotation.Editor.parse)
                        .find((e) => e != null) ?? helper.annotation.Editor.default;

                    switch (element.kind) {
                        case "component": {
                            return [elementId, {
                                kind: protocol.ElementKind.Component,
                                name,
                                description,
                                subtype,
                                ordinal,
                                cameras: element.annotations
                                    .map(helper.annotation.Camera.parse)
                                    .filter((c) => c != null),
                            }];
                        }

                        default: {
                            return [elementId, {
                                kind: element.kind == "struct"
                                    ? protocol.ElementKind.Struct
                                    : element.kind == "variant"
                                    ? protocol.ElementKind.Variant
                                    : protocol.ElementKind.Function,
                                name,
                                description,
                                subtype,
                                ordinal,
                            }];
                        }
                    }
                })
                .filter((v) => v != null),
        );

        return {
            handleCommands,
            name: this.#name,
            saved: this.#saved,
            history,
            toolbox,
            elements,
            dependencies: {}, // TODO: dependencies
            assets: {}, // TODO: assets
        };
    }

    get sceneStateProxy(): protocol.SceneState | null {
        if (this.#openedSceneId == null) return null;

        return {
            sceneId: this.#openedSceneId,
            cameraId: this.#activeCameraId,
        };
    }

    get selection(): protocol.Selection {
        return this.#selection;
    }

    set selection(value: protocol.Selection) {
        if (this.#selection == value) return;
        this.#selection = value;
        this.#channel.send({ messageType: "selection", selection: value });
    }

    get openedSceneId(): string | null {
        return this.#openedSceneId;
    }

    set openedSceneId(sceneId: string | null) {
        if (this.#openedSceneId == sceneId) return;
        this.#openedSceneId = sceneId;
        this.#activeCameraId = null;
        this.#channel.send({ messageType: "scene-state", state: this.sceneStateProxy });
        this.#render();
    }

    get activeCameraId(): string | null {
        return this.#activeCameraId;
    }

    set activeCameraId(cameraId: string | null) {
        if (this.#activeCameraId == cameraId) return;
        this.#activeCameraId = cameraId;
        this.#channel.send({ messageType: "scene-state", state: this.sceneStateProxy });
        this.#render();
    }

    async #handleMessage(message: protocol.Message<protocol.ProjectMessages["ui"]>): Promise<void> {
        switch (message.messageType) {
            case "command": {
                this.#handleCommand(message);
                break;
            }

            case "attach-canvas": {
                const { canvas, width, height } = message;
                const renderer = await this.#renderer;
                renderer.setViewportCanvas(canvas, width, height);
                break;
            }

            case "resize-canvas": {
                const { width, height } = message;
                const renderer = await this.#renderer;
                renderer.resize(width, height);
                break;
            }

            case "detach-canvas": {
                const renderer = await this.#renderer;
                renderer.setViewportCanvas(null);
                break;
            }

            case "select-project": {
                this.selection = { target: protocol.SelectionTarget.Project };
                break;
            }

            case "select-element": {
                this.selection = { target: protocol.SelectionTarget.Element, elementIds: message.elementIds };
                break;
            }

            case "open-scene": {
                this.openedSceneId = message.sceneId;
                break;
            }

            case "activate-camera": {
                this.activeCameraId = message.cameraId;
                break;
            }

            case "queue-edit": {
                this.queueEdit(this.#editCommand(message));
                break;
            }

            case "edit": {
                this.edit(message.label, this.#editCommand(message));
                break;
            }

            case "commit-edit": {
                this.commit(message.label);
                break;
            }

            case "undo": {
                this.undo(message.count);
                break;
            }

            case "redo": {
                this.redo(message.count);
                break;
            }

            default: {
                console.warn(
                    // deno-lint-ignore no-explicit-any
                    `%cworker:project %cUnknown message: ${(message as any).messageType}`,
                    "color:rebeccapurple;font-weight:bold",
                    "",
                );
                break;
            }
        }
    }

    #handleCommand(command: protocol.CommandTriggerData): void {
        if (
            command.state != protocol.CommandState.OneShot &&
            command.state != protocol.CommandState.Down
        ) return;

        switch (command.commandId) {
            case protocol.CommandIds.CloseProject: {
                this.close();
                break;
            }

            case protocol.CommandIds.Undo: {
                this.undo(1);
                break;
            }

            case protocol.CommandIds.Redo: {
                this.redo(1);
                break;
            }

            case protocol.CommandIds.SelectTool: {
                this.selectTool(protocol.Tool.Select);
                break;
            }

            case protocol.CommandIds.ShapeTool: {
                this.selectTool(this.#lastShape);
                break;
            }

            case protocol.CommandIds.RectShapeTool: {
                this.selectTool(protocol.Tool.RectShape);
                break;
            }

            case protocol.CommandIds.CircleShapeTool: {
                this.selectTool(protocol.Tool.CircleShape);
                break;
            }

            case protocol.CommandIds.DrawTool: {
                this.selectTool(this.#lastDraw);
                break;
            }

            case protocol.CommandIds.PenDrawTool: {
                this.selectTool(protocol.Tool.PenDraw);
                break;
            }

            case protocol.CommandIds.FreehandDrawTool: {
                this.selectTool(protocol.Tool.FreehandDraw);
                break;
            }

            default: {
                console.warn(
                    `%cworker:project %cUnknown command: ${command.commandId}`,
                    "color:rebeccapurple;font-weight:bold",
                    "",
                );
                break;
            }
        }
    }

    #editCommand(command: protocol.ProjectMessages["ui"]["queue-edit"]): (state: EditState) => EditState {
        switch (command.editType) {
            case "element-name": {
                return (state) => (EditState.editElementEditorInfo(state, command.elementId, (info) => ({
                    ...info,
                    name: command.name.length == 0 ? null : command.name,
                })));
            }

            case "element-description": {
                return (state) => (EditState.editElementEditorInfo(state, command.elementId, (info) => ({
                    ...info,
                    description: command.description.length == 0 ? null : command.description,
                })));
            }

            case "camera-name":
            case "camera-width":
            case "camera-height":
            case "camera-background": {
                return (state) => (EditState.editCameras(state, command.sceneId, (cameras) => {
                    const index = cameras.findIndex((c) => c.id == command.cameraId);
                    if (index == -1) return cameras;
                    let next: helper.annotation.Camera;

                    switch (command.editType) {
                        case "camera-name":
                            next = { ...cameras[index], name: command.name.length == 0 ? null : command.name };
                            break;
                        case "camera-width":
                            next = { ...cameras[index], width: command.width };
                            break;
                        case "camera-height":
                            next = { ...cameras[index], height: command.height };
                            break;
                        case "camera-background":
                            next = { ...cameras[index], background: command.background };
                            break;
                    }

                    return [...cameras.slice(0, index), next, ...cameras.slice(index + 1)];
                }));
            }

            case "delete-camera": {
                return (state) => (EditState.editCameras(state, command.sceneId, (cameras) => {
                    const index = cameras.findIndex((c) => c.id == command.cameraId);
                    if (index == -1) return cameras;
                    return [...cameras.slice(0, index), ...cameras.slice(index + 1)];
                }));
            }

            default: {
                console.warn(
                    // deno-lint-ignore no-explicit-any
                    `%cworker:project %cUnknown edit command: ${(command as any).editType}`,
                    "color:rebeccapurple;font-weight:bold",
                    "",
                );
                return (x) => x;
            }
        }
    }

    async #render(): Promise<void> {
        const renderer = await this.#renderer;
        const openedSceneOrdinal = this.#openedSceneId != null
            ? this.editState.elementIdMapping.indexOf(this.#openedSceneId)
            : -1;

        if (openedSceneOrdinal == -1) {
            return await renderer.render({
                component: null,
                background: [0, 0, 0, 0],
            });
        }

        const scene = this.editState.compiled.elementTable[openedSceneOrdinal];
        if (!(scene instanceof motion.runtime.Component)) return;

        const camera = this.#activeCameraId == null ? null : scene.info.annotations
            .map(helper.annotation.Camera.parse)
            .filter((c) => c != null)
            .find((c) => c.id == this.#activeCameraId);

        await renderer.render({
            component: scene,
            background: camera?.background != null ? [...camera.background, 1] : [0, 0, 0, 0],
        });
    }

    selectTool(tool: protocol.Tool): void {
        this.#tool = tool;

        if (
            tool == protocol.Tool.RectShape ||
            tool == protocol.Tool.CircleShape
        ) this.#lastShape = tool;

        if (
            tool == protocol.Tool.PenDraw ||
            tool == protocol.Tool.FreehandDraw
        ) this.#lastDraw = tool;

        this.#channel.send({ messageType: "project-state", state: this.stateProxy });
    }

    undo(count: number): void {
        if (this.#history.undoStack.length == 0) return;
        this.#history = HistoryStack.undo(this.#history, count);
        this.#fixState();
        this.#channel.send({ messageType: "project-state", state: this.stateProxy });
        this.#render();
    }

    redo(count: number): void {
        if (this.#history.redoStack.length == 0) return;
        this.#history = HistoryStack.redo(this.#history, count);
        this.#fixState();
        this.#channel.send({ messageType: "project-state", state: this.stateProxy });
        this.#render();
    }

    edit(label: string, updater: (state: EditState) => EditState): void {
        this.#history = HistoryStack.push(this.#history, label, updater);
        this.#pending = null;
        this.#fixState();
        this.#saved = false;
        this.#channel.send({ messageType: "project-state", state: this.stateProxy });
        this.#render();
    }

    queueEdit(updater: (state: EditState) => EditState): void {
        this.#pending = updater(this.editState);
        this.#fixState();
        this.#channel.send({ messageType: "project-state", state: this.stateProxy });
        this.#render();
    }

    commit(label: string): void {
        if (this.#pending == null) return;
        const pending = this.#pending;
        this.#history = HistoryStack.push(this.#history, label, () => pending);
        this.#pending = null;
        this.#saved = false;
        this.#channel.send({ messageType: "project-state", state: this.stateProxy });
    }

    #fixState(): void {
        const state = this.editState;

        // Fixing scene state
        if (this.#openedSceneId != null) {
            const openedSceneOrdinal = state.elementIdMapping.indexOf(this.#openedSceneId);
            let drop = false;

            if (openedSceneOrdinal == -1) {
                this.#openedSceneId = null;
                this.#activeCameraId = null;
                this.#channel.send({ messageType: "scene-state", state: this.sceneStateProxy });
                drop = true;
            }

            if (!drop) {
                const scene = state.compiled.elementTable[openedSceneOrdinal] as motion.runtime.Component;
                const cameras = scene.info.annotations.map(helper.annotation.Camera.parse).filter((c) => c != null);

                if (!cameras.some((c) => c.id == this.#activeCameraId)) {
                    this.#activeCameraId = null;
                    this.#channel.send({ messageType: "scene-state", state: this.sceneStateProxy });
                    drop = true;
                }
            }
        }

        // Fixing selection
        if (this.#selection.target == protocol.SelectionTarget.Element) {
            const currIds = this.#selection.elementIds;
            const allIds = state.elementIdMapping;

            if (currIds.some((id) => !allIds.includes(id))) {
                this.#selection = {
                    target: protocol.SelectionTarget.Element,
                    elementIds: currIds.filter((id) => allIds.includes(id)),
                };

                if (this.#selection.elementIds.length == 0) {
                    this.#selection = { target: protocol.SelectionTarget.Project };
                }

                this.#channel.send({ messageType: "selection", selection: this.#selection });
            }
        }
    }

    async close(): Promise<void> {
        this.#destroyed = true;
        this.#messageHandler();
        this.#viewportChangeHandler();
        (await this.#renderer).close();
        this.#channel.send({ messageType: "close" });
        this.#channel.close();
    }

    [Symbol.dispose](): void {
        this.close();
    }
}

export interface EditState {
    readonly source: ProjectSource;
    readonly compiled: motion.loader.LoadedModule;
    readonly elementIdMapping: readonly string[];
}

export const EditState: {
    create(source: ProjectSource): EditState;
    editMetadata(state: EditState, updater: (metadata: pkg.PackageMetadata) => pkg.PackageMetadata): EditState;
    editElement(
        state: EditState,
        elementId: string,
        updater: (element: motion.model.Element) => motion.model.Element,
    ): EditState;
    editElementEditorInfo(
        state: EditState,
        elementId: string,
        updater: (info: helper.annotation.Editor) => helper.annotation.Editor,
    ): EditState;
    editCameras(
        state: EditState,
        sceneId: string,
        updater: (cameras: readonly helper.annotation.Camera[]) => readonly helper.annotation.Camera[],
    ): EditState;
} = {
    create: (source) => {
        const entry = ProjectSource.entryOf(source);

        return {
            source,
            compiled: ProjectSource.compile(source),
            elementIdMapping: entry.elementTable.map(() => crypto.randomUUID()),
        };
    },

    editMetadata: (state, updater) => {
        const newMetadata = updater(state.source.metadata);
        if (newMetadata == state.source.metadata) return state;

        const newSource: ProjectSource = { ...state.source, metadata: newMetadata };
        const compiled = ProjectSource.compile(newSource);

        return {
            ...state,
            source: newSource,
            compiled,
            elementIdMapping: state.source.metadata.entry == newMetadata.entry
                ? state.elementIdMapping
                : compiled.elementTable.map(() => crypto.randomUUID()),
        };
    },

    editElement: (state, elementId, updater) => {
        const ordinal = state.elementIdMapping.indexOf(elementId);
        if (ordinal == -1) return state;

        const source = ProjectSource.updateEntry(state.source, (module) => {
            const target = module.elementTable[ordinal];
            const next = updater(target);
            if (next == target) return module;

            return {
                ...module,
                elementTable: [
                    ...module.elementTable.slice(0, ordinal),
                    next,
                    ...module.elementTable.slice(ordinal + 1),
                ],
            };
        });

        return state.source == source ? state : {
            ...state,
            source,
            compiled: ProjectSource.compile(source),
        };
    },

    editElementEditorInfo: (state, elementId, updater) => (EditState.editElement(state, elementId, (element) => {
        if (element.kind == "import") return element;
        const infoIdx = element.annotations.findIndex((a) => a.name == helper.annotation.Editor.name);
        const info = infoIdx == -1 ? null : helper.annotation.Editor.parse(element.annotations[infoIdx]);
        const target = info ?? helper.annotation.Editor.default;
        const next = updater(target);
        if (next == target) return element;

        return {
            ...element,
            annotations: infoIdx == -1
                ? [
                    ...element.annotations,
                    helper.annotation.Editor.toAnnotation(next),
                ]
                : [
                    ...element.annotations.slice(0, infoIdx),
                    helper.annotation.Editor.toAnnotation(next),
                    ...element.annotations.slice(infoIdx + 1),
                ],
        };
    })),

    editCameras: (state, sceneId, updater) => (EditState.editElement(state, sceneId, (element) => {
        if (element.kind != "component") return element;
        const cameras = element.annotations.map(helper.annotation.Camera.parse).filter((c) => c != null);
        const next = updater(cameras);
        if (next == cameras) return element;

        return {
            ...element,
            annotations: [
                ...element.annotations.filter((a) => a.name != helper.annotation.Camera.name),
                ...next.map(helper.annotation.Camera.toAnnotation),
            ],
        };
    })),
};

export interface ProjectSource {
    readonly metadata: pkg.PackageMetadata;
    readonly root: Readonly<Record<string, ProjectItem>>;
}

export const ProjectSource: {
    create(): ProjectSource;
    compile(source: ProjectSource): motion.loader.LoadedModule;
    itemOf(source: ProjectSource, path: Iterable<string>): ProjectItem;
    entryOf(source: ProjectSource): motion.model.Module;
    updateItem(
        source: ProjectSource,
        path: Iterable<string>,
        updater: (item: ProjectItem) => ProjectItem,
    ): ProjectSource;
    updateEntry(source: ProjectSource, updater: (module: motion.model.Module) => motion.model.Module): ProjectSource;
} = {
    create: () => ({
        metadata: {
            entry: "main.mdj",
        },
        root: {
            "main.mdj": {
                kind: ProjectItemKind.Module,
                content: {
                    elementTable: [
                        { kind: "import", module: "builtin:core", name: "number" },
                        { kind: "import", module: "builtin:graphics", name: "Vector" },
                        {
                            kind: "component",
                            annotations: [
                                motion.annotation.annotate("editor", {
                                    name: "Scene",
                                    subtype: "scene",
                                }),
                                motion.annotation.annotate("camera", {
                                    id: "main",
                                    name: "Camera",
                                    width: 640,
                                    height: 360,
                                    background: [0, 0, 0],
                                }),
                            ],
                            typeParams: [],
                            parameters: {
                                time: {
                                    annotations: [
                                        motion.annotation.annotate("editor", {
                                            name: "Time",
                                        }),
                                        motion.annotation.annotate("timeline", {
                                            type: "time",
                                            start: 0,
                                            end: 5000,
                                            fps: 24,
                                        }),
                                    ],
                                    inputs: [],
                                    returnType: { kind: "fresh", declOrdinal: 0, typeParams: [] },
                                    fallback: { kind: "default" },
                                },
                            },
                            slots: {},
                            content: [
                                {
                                    kind: "component",
                                    annotations: [],
                                    componentOrdinal: 1,
                                    typeParams: [],
                                    parameters: {
                                        path: {
                                            kind: "array",
                                            values: [
                                                {
                                                    kind: "variant",
                                                    option: "Move",
                                                    data: {
                                                        kind: "struct",
                                                        fields: {
                                                            x: { kind: "number", value: -100 },
                                                            y: { kind: "number", value: 0 },
                                                        },
                                                    },
                                                },
                                                {
                                                    kind: "variant",
                                                    option: "Cubic",
                                                    data: {
                                                        kind: "struct",
                                                        fields: {
                                                            cp1: {
                                                                kind: "struct",
                                                                fields: {
                                                                    x: { kind: "number", value: 0 },
                                                                    y: { kind: "number", value: +100 },
                                                                },
                                                            },
                                                            cp2: {
                                                                kind: "struct",
                                                                fields: {
                                                                    x: { kind: "number", value: 0 },
                                                                    y: { kind: "number", value: -100 },
                                                                },
                                                            },
                                                            target: {
                                                                kind: "struct",
                                                                fields: {
                                                                    x: { kind: "number", value: +100 },
                                                                    y: { kind: "number", value: 0 },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                        fill: {
                                            kind: "variant",
                                            option: "Solid",
                                            data: {
                                                kind: "struct",
                                                fields: {
                                                    red: { kind: "number", value: 1 },
                                                    green: { kind: "number", value: 0 },
                                                    blue: { kind: "number", value: 0 },
                                                },
                                            },
                                        },
                                    },
                                    slots: {},
                                },
                            ],
                        },
                    ],
                    exports: {},
                } as const,
            },
        },
    }),

    compile: (source) => {
        // TODO: proper project compiling with dependencies and stuffs
        return motion.loader.loadModule({
            source: ProjectSource.entryOf(source),
            resolve: motion.loader.createResolver({
                "builtin:core": motion.runtime.coreModule,
                ...Object.fromEntries(Object.entries(stdlib).map(([name, mod]) => [`builtin:${name}`, mod])),
            }),
        });
    },

    itemOf: (source, path) => {
        let target: ProjectItem = { kind: ProjectItemKind.Folder, content: source.root };
        const visited: string[] = [];

        for (const segment of path) {
            if (target.kind != ProjectItemKind.Folder) {
                const pathStr = visited.join("/");
                throw new Error(`Not a folder: /${pathStr}`);
            }

            target = target.content[segment];
            visited.push(segment);
        }

        return target;
    },

    entryOf: (source) => {
        const item = ProjectSource.itemOf(source, pathSegments(source.metadata.entry));

        if (item.kind != ProjectItemKind.Module) {
            throw new Error(`Entry point to item that is not a module: ${source.metadata.entry}`);
        }

        return item.content;
    },

    updateItem: (source, path, updater) => {
        const segments = [...path];

        if (segments.length == 0) {
            const next = updater({ kind: ProjectItemKind.Folder, content: source.root });
            if (next.kind != ProjectItemKind.Folder) throw new Error(`New project item must be a folder`);
            if (next.content == source.root) return source;
            return { ...source, root: next.content };
        }

        return ProjectSource.updateItem(source, segments.slice(0, segments.length - 1), (item) => {
            if (item.kind != ProjectItemKind.Folder) {
                const pathStr = segments.slice(0, segments.length - 1).join("/");
                throw new Error(`Not a folder: /${pathStr}`);
            }

            const target = item.content[segments[segments.length - 1]];
            const next = updater(target);
            if (next == target) return item;

            return {
                ...item,
                content: {
                    ...item.content,
                    [segments[segments.length - 1]]: next,
                },
            };
        });
    },

    updateEntry: (source, updater) => (ProjectSource.updateItem(source, pathSegments(source.metadata.entry), (item) => {
        if (item.kind != ProjectItemKind.Module) {
            throw new Error(`Entry point to item that is not a module: ${source.metadata.entry}`);
        }

        const next = updater(item.content);
        if (next == item.content) return item;

        return {
            ...item,
            content: updater(item.content),
        };
    })),
};

export type ProjectItem =
    | ProjectFolderItem
    | ProjectModuleItem
    | ProjectAssetItem;

export enum ProjectItemKind {
    Folder,
    Module,
    Asset,
}

export interface ProjectFolderItem {
    readonly kind: ProjectItemKind.Folder;
    readonly content: Readonly<Record<string, ProjectItem>>;
}

export interface ProjectModuleItem {
    readonly kind: ProjectItemKind.Module;
    readonly content: motion.model.Module;
}

export interface ProjectAssetItem {
    readonly kind: ProjectItemKind.Asset;
    readonly content: Blob;
}
