import type { ComponentType } from "preact";
import * as protocol from "../protocol.ts";
import { useEffect } from "preact/hooks";

export interface KeyInput {
    readonly combination: protocol.KeyCombination;
    readonly state: protocol.CommandState.Down | protocol.CommandState.Hold | protocol.CommandState.Up;
    readonly extra: protocol.ExtraActionData;
}

const handlers = new Set<(input: KeyInput) => boolean>();
const keymap: Partial<Record<string, protocol.Key>> = {
    KeyA: protocol.Key.A,
    KeyB: protocol.Key.B,
    KeyC: protocol.Key.C,
    KeyD: protocol.Key.D,
    KeyE: protocol.Key.E,
    KeyF: protocol.Key.F,
    KeyG: protocol.Key.G,
    KeyH: protocol.Key.H,
    KeyI: protocol.Key.I,
    KeyJ: protocol.Key.J,
    KeyK: protocol.Key.K,
    KeyL: protocol.Key.L,
    KeyM: protocol.Key.M,
    KeyN: protocol.Key.N,
    KeyO: protocol.Key.O,
    KeyP: protocol.Key.P,
    KeyQ: protocol.Key.Q,
    KeyR: protocol.Key.R,
    KeyS: protocol.Key.S,
    KeyT: protocol.Key.T,
    KeyU: protocol.Key.U,
    KeyV: protocol.Key.V,
    KeyW: protocol.Key.W,
    KeyX: protocol.Key.X,
    KeyY: protocol.Key.Y,
    KeyZ: protocol.Key.Z,
    Digit1: protocol.Key.Digit1,
    Digit2: protocol.Key.Digit2,
    Digit3: protocol.Key.Digit3,
    Digit4: protocol.Key.Digit4,
    Digit5: protocol.Key.Digit5,
    Digit6: protocol.Key.Digit6,
    Digit7: protocol.Key.Digit7,
    Digit8: protocol.Key.Digit8,
    Digit9: protocol.Key.Digit9,
    Space: protocol.Key.Spacebar,
    F1: protocol.Key.F1,
    F2: protocol.Key.F2,
    F3: protocol.Key.F3,
    F4: protocol.Key.F4,
    F5: protocol.Key.F5,
    F6: protocol.Key.F6,
    F7: protocol.Key.F7,
    F8: protocol.Key.F8,
    F9: protocol.Key.F9,
    F10: protocol.Key.F10,
    F11: protocol.Key.F11,
    F12: protocol.Key.F12,
    Numpad1: protocol.Key.Num1,
    Numpad2: protocol.Key.Num2,
    Numpad3: protocol.Key.Num3,
    Numpad4: protocol.Key.Num4,
    Numpad5: protocol.Key.Num5,
    Numpad6: protocol.Key.Num6,
    Numpad7: protocol.Key.Num7,
    Numpad8: protocol.Key.Num8,
    Numpad9: protocol.Key.Num9,
};

export function registerInputHandler(callback: (input: KeyInput) => boolean): () => void {
    handlers.add(callback);
    return () => handlers.delete(callback);
}

export function sendKeyInput(input: KeyInput): boolean {
    for (const handler of handlers) if (handler(input)) return true;
    return false;
}

export const KeyInputHandler: ComponentType<{ onInput: (input: KeyInput) => boolean }> = ({ onInput, children }) => {
    useEffect(() => registerInputHandler(onInput), [onInput]);
    return children;
};

const holdingDown = new Set<protocol.Key>();

document.addEventListener("keydown", (e) => {
    if (e.target != null && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        return;
    }

    const key = keymap[e.code];
    if (key == null) return;

    const ctrl = e.ctrlKey;
    const alt = e.altKey;
    const shift = e.shiftKey;
    const state = holdingDown.has(key) ? protocol.CommandState.Hold : protocol.CommandState.Down;
    holdingDown.add(key);

    const cancel = sendKeyInput({
        combination: { key, ctrl, alt, shift },
        state,
        extra: {},
    });

    if (cancel) {
        e.preventDefault();
    }
});

document.addEventListener("keyup", (e) => {
    if (e.target != null && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        return;
    }

    const key = keymap[e.code];
    if (key == null) return;

    const ctrl = e.ctrlKey;
    const alt = e.altKey;
    const shift = e.shiftKey;
    holdingDown.delete(key);

    const cancel = sendKeyInput({
        combination: { key, ctrl, alt, shift },
        state: protocol.CommandState.Up,
        extra: {},
    });

    if (cancel) {
        e.preventDefault();
    }
});
