import { ISceneObjectType } from "../scene/object.js";
import { IScene } from "../scene/scene.js";
import { IEditor } from "./editor.js";

export interface ICommand<T = any> {
    /**
     * The command context that will only become available when that context is present. For example, to only activate
     * the command if user is hovering in viewport and pressing the `Shift + A` keyboard shortcut, use
     * `command.context.viewport`.
     */
    readonly context?: ICommandContextRef<T>;

    /**
     * A list of default keyboard shortcuts that can be used to activate the command.
     */
    readonly defaultKeyboardShortcuts?: IKeyChord[];

    /**
     * A list of child commands, which will be opened as menu at cursor position if activated using keyboard shortcut,
     * or as submenu of parent command.
     */
    readonly children?: ICommand[];

    /**
     * Activate this command.
     * @param editor The editor that activated this command.
     * @param context The content of the current context. Each command can only handle a single context.
     */
    activate?(editor: IEditor, context: T): void;
}

export interface IKeyCombination {
    readonly ctrl?: boolean;
    readonly shift?: boolean;
    readonly alt?: boolean;
    readonly key: string;
}

/**
 * A key chord, which is a sequence of key combinations to press in order in order to activate the command. For example,
 * if the chord is `Ctrl + K, Ctrl + K`, user will have to hold `Ctrl` and press `K` twice to activate the command.
 */
export type IKeyChord = IKeyCombination[];

export interface ICommandContext<T> {
    readonly type: string;
    getNow(editor: IEditor): T;
}

export type ICommandContextRef<T> = [ICommandContext<T> | undefined];

export namespace command {
    export namespace context {
        export type viewport = {
            readonly scene: IScene,
            readonly sceneX: number,
            readonly sceneY: number,
            add(type: ISceneObjectType, sx: number, sy: number): void,
        };

        export const viewport: ICommandContextRef<viewport> = [undefined];
    }
}