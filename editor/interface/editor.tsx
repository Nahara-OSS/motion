import * as protocol from "../protocol.ts";
import { useContext, useEffect, useState } from "preact/hooks";
import { type ComponentType, createContext } from "preact";
import { CommandHandler, triggerCommand, useCommandState } from "./command.tsx";
import { Menu, MenuButton, MenuGroup, MenuSeparator } from "./menu.tsx";
import { FillLabel, IconLabel, TextLabel } from "./label.tsx";
import { type Languages, TranslatedKeyLabel, TranslatedTextLabel, TranslationProvider } from "./translation.tsx";
import { Project, ProjectProvider } from "./project.tsx";
import { type KeyInput, KeyInputHandler } from "./keybind.tsx";
import { Button } from "./control.tsx";

export class Editor implements Disposable {
    #worker = new Worker("./worker.js", { name: "Nahara's Motion", type: "module" });
    #channel: protocol.EditorMessages["uiChannel"];
    #state: protocol.EditorState = protocol.EditorState.Initial;
    #settings: protocol.Settings = protocol.Settings.Initial;
    #projects: readonly Project[] = [];
    #activeProject: Project | null = null;
    #messageHandler: () => void;
    #projectOpenHandlers = new Set<(project: Project) => void>();
    #projectCloseHandlers = new Set<(project: Project) => void>();
    #projectActivateHandlers = new Set<(project: Project | null) => void>();

    constructor() {
        this.#channel = protocol.EditorMessages.createUIChannel(this.#worker);
        this.#messageHandler = this.#channel.listen((message) => this.#handleMessage(message));
    }

    get state(): protocol.EditorState {
        return this.#state;
    }

    get settings(): protocol.Settings {
        return this.#settings;
    }

    get projects(): readonly Project[] {
        return this.#projects;
    }

    get activeProject(): Project | null {
        return this.#activeProject;
    }

    set activeProject(project: Project | null) {
        if (this.#activeProject == project) return;
        this.#activeProject = project;
        this.#projectActivateHandlers.forEach((handler) => handler(project));
    }

    #handleMessage(message: protocol.Message<protocol.EditorMessages["editor"]>): void {
        switch (message.messageType) {
            case "state": {
                this.#state = message.state;
                break;
            }

            case "settings": {
                this.#settings = message.settings;
                break;
            }

            case "open-url": {
                open(message.url);
                break;
            }

            case "open-project": {
                this.#openProject(message);
                break;
            }

            default: {
                console.warn(
                    // deno-lint-ignore no-explicit-any
                    `%cui:editor %cUnknown message: ${(message as any).messageType}`,
                    "color:rebeccapurple;font-weight:bold",
                    "",
                );
                break;
            }
        }
    }

    #openProject(message: protocol.EditorMessages["editor"]["open-project"]): void {
        const channel = protocol.ProjectMessages.createUIChannel(message.port);

        const project = new Project({
            channel,
            state: message.project,
            scene: null,
        });

        const closeHandler = channel.listen((message) => {
            if (message.messageType == "close") {
                this.#projects = this.#projects.filter((p) => p != project);
                this.#projectCloseHandlers.forEach((handler) => handler(project));
                if (this.#activeProject == project) this.activeProject = this.#projects.at(0) ?? null;
                closeHandler();
            }
        });

        this.#projects = [...this.#projects, project];
        this.#projectOpenHandlers.forEach((handler) => handler(project));
        this.activeProject = project;
        channel.start();
    }

    onProjectOpen(callback: (project: Project) => void): () => void {
        this.#projectOpenHandlers.add(callback);
        return () => this.#projectOpenHandlers.delete(callback);
    }

    onProjectClose(callback: (project: Project) => void): () => void {
        this.#projectCloseHandlers.add(callback);
        return () => this.#projectCloseHandlers.delete(callback);
    }

    onProjectActivate(callback: (project: Project | null) => void): () => void {
        this.#projectActivateHandlers.add(callback);
        return () => this.#projectActivateHandlers.delete(callback);
    }

    useState(): protocol.EditorState {
        const [state, setState] = useState(this.#state);

        useEffect(() => {
            if (state != this.#state) setState(this.#state);
            this.#channel.listen((message) => {
                if (message.messageType != "state") return;
                setState(message.state);
            });
        }, []);

        return state;
    }

    useSettings(): readonly [
        protocol.Settings,
        (value: protocol.Settings | ((value: protocol.Settings) => protocol.Settings)) => void,
    ] {
        const [settings, setSettings] = useState(this.#settings);

        useEffect(() => {
            if (settings != this.#settings) setSettings(this.#settings);
            this.#channel.listen((message) => {
                if (message.messageType != "settings") return;
                setSettings(message.settings);
            });
        }, []);

        return [
            settings,
            (updater) => {
                setSettings(updater);
                this.#settings = typeof updater == "function" ? updater(this.#settings) : updater;
                this.#channel.send({ messageType: "save-settings", settings: this.#settings });
            },
        ];
    }

    useProjects(): readonly Project[] {
        const [list, setList] = useState(this.#projects);
        useEffect(() => (this.onProjectOpen((project) => setList((list) => [...list, project]))), []);
        useEffect(() => (this.onProjectClose((project) => setList((list) => list.filter((p) => p != project)))), []);
        return list;
    }

    useActiveProject(): Project | null {
        const [project, setProject] = useState(this.#activeProject);
        useEffect(() => (this.onProjectActivate((project) => setProject(project))), []);
        return project;
    }

    sendCommand(command: protocol.CommandTriggerData): void {
        this.#channel.send({ messageType: "command", ...command });
    }

    close(): void {
        this.#messageHandler();
        this.#channel.close();
    }

    [Symbol.dispose](): void {
        this.close();
    }
}

const EditorContext = createContext<Editor | null>(null);

export function useEditor(): Editor {
    const editor = useContext(EditorContext);
    if (editor == null) throw new Error("Editor is not provided from <EditorProvider />");
    return editor;
}

export const EditorProvider: ComponentType<{
    editor: Editor;
    languages: Languages;
}> = ({
    editor,
    languages,
    children,
}) => {
    const [{ x: translator }, setTranslator] = useState({ x: languages.translate });
    const state = editor.useState();
    const [settings] = editor.useSettings();
    const activeProject = editor.useActiveProject();

    useEffect(() => languages.onLanguageLoad(() => setTranslator({ x: languages.translate })), [languages]);

    // TODO: don't use this when user is on desktop (?)
    useEffect(() => {
        const beforeUnload = (e: BeforeUnloadEvent) => {
            const notSaved = editor.projects.some((p) => !p.state.saved);
            if (notSaved) e.preventDefault();
        };

        addEventListener("beforeunload", beforeUnload);
        return () => removeEventListener("beforeunload", beforeUnload);
    }, []);

    function onKeyInput(input: KeyInput): boolean {
        const { combination: { key, ctrl, shift, alt }, state, extra } = input;

        for (const commandId in settings.keyBinds) {
            const kbs = settings.keyBinds[commandId]!;

            if (kbs.some((kb) => kb.key == key && kb.ctrl == ctrl && kb.shift == shift && kb.alt == alt)) {
                triggerCommand({ commandId, state, extra });
                return true;
            }
        }

        return false;
    }

    return (
        <>
            <CommandHandler
                onCheck={(id) => state.handleCommands.includes(id)}
                onCommand={(command) => editor.sendCommand(command)}
            />
            <KeyInputHandler onInput={onKeyInput} />
            <EditorContext.Provider value={editor}>
                <ProjectProvider project={activeProject}>
                    <TranslationProvider translator={(id) => translator(settings.language, id)}>
                        {children}
                    </TranslationProvider>
                </ProjectProvider>
            </EditorContext.Provider>
        </>
    );
};

export const EditorMenuBar: ComponentType = () => {
    const editor = useEditor();
    const [settings] = editor.useSettings();

    return (
        <MenuGroup>
            {settings.menus.map((menu, key) => <EditorMenu key={key} menu={menu} />)}
        </MenuGroup>
    );
};

const EditorMenu: ComponentType<{ menu: protocol.Menu }> = ({ menu }) => {
    const editor = useEditor();
    const projects = editor.useProjects();

    return (
        <Menu label={<TextLabel>{menu.label}</TextLabel>}>
            {menu.content.map((item, key) => (
                item.kind == protocol.MenuItemKind.Menu
                    ? <EditorMenu key={key} menu={item} />
                    : item.kind == protocol.MenuItemKind.Command
                    ? <EditorMenuCommand key={key} item={item} />
                    : item.kind == protocol.MenuItemKind.Separator
                    ? <MenuSeparator />
                    : item.type == protocol.MenuSpecialType.Projects
                    ? (
                        <Menu label={<TranslatedTextLabel tr="projects" />}>
                            {projects.map((project) => <EditorProjectButton key={project} project={project} />)}
                            {projects.length != 0 ? null : (
                                <MenuButton enabled={false} onClick={() => {}}>
                                    <TranslatedTextLabel tr="noOpenedProjects" />
                                </MenuButton>
                            )}
                        </Menu>
                    )
                    : null
            ))}
        </Menu>
    );
};

const EditorMenuCommand: ComponentType<{ item: protocol.MenuCommandItem }> = ({ item }) => {
    const editor = useEditor();
    const [settings] = editor.useSettings();
    const enabled = useCommandState(item.commandId);

    return (
        <MenuButton
            enabled={enabled}
            onClick={() => (triggerCommand({
                commandId: item.commandId,
                state: protocol.CommandState.OneShot,
                extra: {},
            }))}
        >
            <TranslatedTextLabel tr={item.commandId} />
            <FillLabel />
            {(settings.keyBinds[item.commandId] ?? []).map((v, i) => <TranslatedKeyLabel key={i} value={v} />)}
        </MenuButton>
    );
};

const EditorProjectButton: ComponentType<{ project: Project }> = ({ project }) => {
    const editor = useEditor();
    const active = editor.useActiveProject();
    const state = project.useProjectState();

    return (
        <MenuButton enabled onClick={() => editor.activeProject = project}>
            <IconLabel type={active == project ? "checked" : "space"} />
            {state.name != null ? <TextLabel>{state.name}</TextLabel> : <TranslatedTextLabel tr="unnamedProject" />}
        </MenuButton>
    );
};

export const EditorQuickActionBar: ComponentType = () => {
    const editor = useEditor();
    const [settings] = editor.useSettings();
    return settings.quickActions.map((commandId) => <EditorQuickAction key={commandId} command={commandId} />);
};

const EditorQuickAction: ComponentType<{ command: string }> = ({ command }) => {
    const editor = useEditor();
    const [settings] = editor.useSettings();
    const enabled = useCommandState(command);

    return (
        <Button style="bordered" state={enabled ? "normal" : "disabled"}>
            <TranslatedTextLabel tr={command} />
            {(settings.keyBinds[command] ?? []).map((v, i) => <TranslatedKeyLabel key={i} value={v} />)}
        </Button>
    );
};
