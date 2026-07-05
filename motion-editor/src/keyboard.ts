import { getContext } from "svelte";

/**
 * Context for keyboard handling.
 *
 * Components can register key combination handling to this context (and unregister when the component is removed from
 * the tree).
 */
export class KeyboardHandler {
    #locked = false;

    register(keys: readonly KeyCombination[], callbacks: {
        readonly keydown: (e: KeyboardEvent) => unknown;
        readonly keyup: (e: KeyboardEvent) => unknown;
    }): () => void {
        const keydownWrapper = (e: KeyboardEvent) => {
            if (this.#locked) return;
            if (!keys.some((c) => isKeyCombinationPressed(e, c))) return;
            e.preventDefault();
            callbacks.keydown(e);
        };

        const keyupWrapper = (e: KeyboardEvent) => {
            if (this.#locked) return;
            if (!keys.some((c) => isKeyCombinationPressed(e, c))) return;
            e.preventDefault();
            callbacks.keyup(e);
        };

        document.addEventListener("keydown", keydownWrapper);
        document.addEventListener("keyup", keyupWrapper);

        return () => {
            document.removeEventListener("keydown", keydownWrapper);
            document.removeEventListener("keyup", keyupWrapper);
        };
    }

    /**
     * Lock the keyboard handler.
     *
     * The handler should be locked when the keyboard need to be exclusively controlled, such as entering in text box or
     * controlling the camera with flight controls in viewport.
     *
     * @returns Lock release function
     */
    lock(): () => void {
        this.#locked = true;
        return () => this.#locked = false;
    }
}

export function getKeyboardHandler(): KeyboardHandler {
    return getContext(KeyboardHandler);
}

/**
 * Keybind configuration.
 *
 * Each entry consists of one or multiple possible key combinations that trigger the functionality.
 */
export interface Keybind {
    readonly file: {
        readonly openProject: readonly KeyCombination[];
        readonly saveScene: readonly KeyCombination[];
        readonly saveSceneAs: readonly KeyCombination[];
        readonly closeProject: readonly KeyCombination[];
        readonly closeScene: readonly KeyCombination[];
    };

    readonly edit: {
        readonly undo: readonly KeyCombination[];
        readonly redo: readonly KeyCombination[];
        readonly cut: readonly KeyCombination[];
        readonly copy: readonly KeyCombination[];
        readonly paste: readonly KeyCombination[];
    };

    readonly playback: {
        readonly playPause: readonly KeyCombination[];
        readonly playStop: readonly KeyCombination[];
        readonly seekToStart: readonly KeyCombination[];
        readonly seekToEnd: readonly KeyCombination[];
        readonly seekToPrevFrame: readonly KeyCombination[];
        readonly seekToNextFrame: readonly KeyCombination[];
        readonly seekToPrevMarker: readonly KeyCombination[];
        readonly seekToNextMarker: readonly KeyCombination[];
    };

    readonly window: {
        readonly explorer: readonly KeyCombination[];
        readonly history: readonly KeyCombination[];
        readonly outline: readonly KeyCombination[];
        readonly settings: readonly KeyCombination[];
        readonly viewport: readonly KeyCombination[];
    };

    readonly workspace: {
        readonly exportJson: readonly KeyCombination[];
        readonly exportClipboard: readonly KeyCombination[];
        readonly importClipboard: readonly KeyCombination[];
    };

    readonly help: {
        readonly userManual: readonly KeyCombination[];
        readonly aboutMotion: readonly KeyCombination[];
    };
}

/**
 * Represent a key combination.
 *
 * A key combination consists of modifier keys (Control, Alt or Shift) and the main key.
 */
export interface KeyCombination {
    readonly ctrl: boolean;
    readonly shift: boolean;
    readonly alt: boolean;
    readonly code: string;
}

export const Keybind: Keybind = {
    file: {
        openProject: [{ ctrl: true, shift: false, alt: false, code: "KeyO" }],
        saveScene: [{ ctrl: true, shift: false, alt: false, code: "KeyS" }],
        saveSceneAs: [{ ctrl: true, shift: true, alt: false, code: "KeyS" }],
        closeProject: [],
        closeScene: [],
    },

    edit: {
        undo: [{ ctrl: true, shift: false, alt: false, code: "KeyZ" }],
        redo: [
            { ctrl: true, shift: true, alt: false, code: "KeyZ" },
            { ctrl: true, shift: false, alt: false, code: "KeyY" },
        ],
        cut: [{ ctrl: true, shift: false, alt: false, code: "KeyX" }],
        copy: [{ ctrl: true, shift: false, alt: false, code: "KeyC" }],
        paste: [{ ctrl: true, shift: false, alt: false, code: "KeyV" }],
    },

    playback: {
        playPause: [{ ctrl: false, shift: false, alt: false, code: "Space" }],
        playStop: [{ ctrl: true, shift: false, alt: false, code: "Space" }],
        seekToStart: [{ ctrl: false, shift: false, alt: false, code: "Home" }],
        seekToEnd: [{ ctrl: false, shift: false, alt: false, code: "End" }],
        seekToPrevFrame: [{ ctrl: false, shift: false, alt: false, code: "ArrowLeft" }],
        seekToNextFrame: [{ ctrl: false, shift: false, alt: false, code: "ArrowRight" }],
        seekToPrevMarker: [{ ctrl: true, shift: false, alt: false, code: "ArrowLeft" }],
        seekToNextMarker: [{ ctrl: true, shift: false, alt: false, code: "ArrowRight" }],
    },

    window: {
        explorer: [],
        history: [],
        outline: [],
        settings: [],
        viewport: [],
    },

    workspace: {
        exportJson: [],
        exportClipboard: [],
        importClipboard: [],
    },

    help: {
        userManual: [{ ctrl: false, shift: false, alt: false, code: "F1" }],
        aboutMotion: [],
    },
};

export function isKeyCombinationPressed(e: KeyboardEvent, combination: KeyCombination): boolean {
    const { ctrl, shift, alt, code } = combination;
    return e.ctrlKey == ctrl && e.shiftKey == shift && e.altKey == alt && e.code == code;
}
