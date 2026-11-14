import * as protocol from "../protocol.ts";
import config from "../config.json" with { type: "json" };
import { Project, ProjectSource } from "./project.ts";

export class Editor implements Disposable {
    #channel = protocol.EditorMessages.createEditorChannel();
    #messageHandler: () => void;

    constructor() {
        this.#messageHandler = this.#channel.listen((message) => this.#handleMessage(message));
    }

    get stateProxy(): protocol.EditorState {
        return {
            ...protocol.EditorState.Initial,
        };
    }

    #handleMessage(message: protocol.Message<protocol.EditorMessages["ui"]>): void {
        switch (message.messageType) {
            case "command": {
                this.#handleCommand(message);
                break;
            }

            default: {
                console.warn(
                    `%cworker:editor %cUnknown message: ${message.messageType}`,
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
        ) {
            // don't handle repeat and keyup
            return;
        }

        switch (command.commandId) {
            case protocol.CommandIds.NewProject: {
                const pipe = new MessageChannel();
                const project = new Project({
                    name: null,
                    channel: protocol.ProjectMessages.createEditorChannel(pipe.port1),
                    source: ProjectSource.create(),
                    save: null,
                });
                this.#channel.send({
                    messageType: "open-project",
                    port: pipe.port2,
                    project: project.stateProxy,
                });
                pipe.port1.start();
                break;
            }

            case protocol.CommandIds.OnlineManual: {
                this.#channel.send({ messageType: "open-url", url: config.links.onlineManual });
                break;
            }

            case protocol.CommandIds.SourceCode: {
                this.#channel.send({ messageType: "open-url", url: config.links.source });
                break;
            }

            case protocol.CommandIds.BugReport: {
                this.#channel.send({ messageType: "open-url", url: config.links.bugReport });
                break;
            }

            default: {
                console.warn(
                    `%cworker:editor %cUnknown command: ${command.commandId}`,
                    "color:rebeccapurple;font-weight:bold",
                    "",
                );
                break;
            }
        }
    }

    broadcastState(): void {
        this.#channel.send({ messageType: "state", state: this.stateProxy });
    }

    broadcastSettings(): void {
        this.#channel.send({ messageType: "settings", settings: protocol.Settings.Initial });
    }

    close(): void {
        this.#messageHandler();
    }

    [Symbol.dispose](): void {
        this.close();
    }
}
