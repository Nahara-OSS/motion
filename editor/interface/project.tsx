import * as protocol from "../protocol.ts";
import { type ComponentType, createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import { CommandHandler } from "./command.tsx";

export interface ProjectCreateOptions {
    readonly channel: protocol.ProjectMessages["uiChannel"];
    readonly state: protocol.ProjectState;
    readonly scene: protocol.SceneState | null;
}

export class Project implements Disposable {
    #channel: protocol.ProjectMessages["uiChannel"];
    #state: protocol.ProjectState;
    #scene: protocol.SceneState | null;
    #selection = protocol.Selection.Initial;
    #messageHandler: () => void;

    constructor(options: ProjectCreateOptions) {
        this.#channel = options.channel;
        this.#state = options.state;
        this.#scene = options.scene;
        this.#messageHandler = this.#channel.listen((message) => this.#handleMessage(message));
    }

    get state(): protocol.ProjectState {
        return this.#state;
    }

    get sceneState(): protocol.SceneState | null {
        return this.#scene;
    }

    get selection(): protocol.Selection {
        return this.#selection;
    }

    #handleMessage(message: protocol.Message<protocol.ProjectMessages["editor"]>): void {
        switch (message.messageType) {
            case "close": {
                this.close();
                break;
            }

            case "project-state": {
                this.#state = message.state;
                break;
            }

            case "scene-state": {
                this.#scene = message.state;
                break;
            }

            case "selection": {
                this.#selection = message.selection;
                break;
            }

            default: {
                console.warn(
                    // deno-lint-ignore no-explicit-any
                    `%cui:project %cUnknown message: ${(message as any).messageType}`,
                    "color:rebeccapurple;font-weight:bold",
                    "",
                );
                break;
            }
        }
    }

    useProjectState(): protocol.ProjectState {
        const [state, setState] = useState(this.#state);

        useEffect(() => {
            if (state != this.#state) setState(state);
            return this.#channel.listen((message) => {
                if (message.messageType != "project-state") return;
                setState(message.state);
            });
        }, []);

        return state;
    }

    useSceneState(): protocol.SceneState | null {
        const [state, setState] = useState(this.#scene);

        useEffect(() => {
            if (state != this.#scene) setState(this.#scene);
            return this.#channel.listen((message) => {
                if (message.messageType != "scene-state") return;
                setState(message.state);
            });
        }, []);

        return state;
    }

    useSelection(): protocol.Selection {
        const [selection, setSelection] = useState(this.#selection);

        useEffect(() => {
            if (selection != this.#selection) setSelection(this.#selection);
            return this.#channel.listen((message) => {
                if (message.messageType != "selection") return;
                setSelection(message.selection);
            });
        }, []);

        return selection;
    }

    sendCommand(command: protocol.CommandTriggerData): void {
        this.#channel.send({ messageType: "command", ...command });
    }

    sendCanvas(canvas: OffscreenCanvas, width: number, height: number): void {
        this.#channel.send({ messageType: "attach-canvas", canvas, width, height });
    }

    updateCanvas(width: number, height: number): void {
        this.#channel.send({ messageType: "resize-canvas", width, height });
    }

    dropCanvas(): void {
        this.#channel.send({ messageType: "detach-canvas" });
    }

    openScene(sceneId: string | null): void {
        this.#channel.send({ messageType: "open-scene", sceneId });
    }

    activateCamera(cameraId: string | null): void {
        this.#channel.send({ messageType: "activate-camera", cameraId });
    }

    selectProject(): void {
        this.#channel.send({ messageType: "select-project" });
    }

    selectElement(elementIds: readonly string[]): void {
        this.#channel.send({ messageType: "select-element", elementIds });
    }

    queueEdit(data: protocol.ProjectMessages["ui"]["queue-edit"]): void {
        this.#channel.send({ messageType: "queue-edit", ...data });
    }

    commitEdit(label: string): void {
        this.#channel.send({ messageType: "commit-edit", label });
    }

    edit(data: protocol.ProjectMessages["ui"]["edit"]): void {
        this.#channel.send({ messageType: "edit", ...data });
    }

    undo(count: number): void {
        this.#channel.send({ messageType: "undo", count });
    }

    redo(count: number): void {
        this.#channel.send({ messageType: "redo", count });
    }

    close(): void {
        this.#messageHandler();
        this.#channel.close();
    }

    [Symbol.dispose](): void {
        this.close();
    }
}

const ProjectContext = createContext<Project | null>(null);

export function useProject(): Project | null {
    return useContext(ProjectContext);
}

export const ProjectProvider: ComponentType<{ project: Project | null }> = ({ project, children }) => {
    return (
        <>
            {project == null ? null : <ProjectHandlers project={project} />}
            <ProjectContext.Provider value={project}>
                {children}
            </ProjectContext.Provider>
        </>
    );
};

const ProjectHandlers: ComponentType<{ project: Project }> = ({ project }) => {
    const state = project.useProjectState();

    return (
        <CommandHandler
            onCheck={(id) => state.handleCommands.includes(id)}
            onCommand={(command) => project.sendCommand(command)}
        />
    );
};
