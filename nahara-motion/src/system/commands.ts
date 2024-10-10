import { command, ICommand } from "../editor/command.js";

export namespace builtInCommands.viewport {
    export const add: ICommand<command.context.viewport> = {
        context: command.context.viewport,
        defaultKeyboardShortcuts: [
            [{ shift: true, key: "KeyA" }]
        ],
        activate(editor, context) {
            console.log("TODO");
        },
    };
}