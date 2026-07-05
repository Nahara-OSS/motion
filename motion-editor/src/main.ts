import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";
import { EditorSession } from "./editor.ts";
import { Theme } from "./theme.ts";
import { KeyboardHandler } from "./keyboard.ts";

const session = await EditorSession.create();

const app = mount(App, {
    target: document.getElementById("app")!,

    // deno-lint-ignore no-explicit-any
    context: new Map<any, any>([
        [EditorSession, session],
        [KeyboardHandler, new KeyboardHandler()],
        [
            Theme,
            {
                animatorEditor: {
                    handleSize: 12,
                    altHandleSize: 20,
                },
            } satisfies Theme,
        ],
    ]),
});

export default app;
