import { Editor } from "./editor.ts";

const editor = new Editor();
editor.broadcastState();
editor.broadcastSettings();

console.log(
    "%cworker:main %cInitialized",
    "color:rebeccapurple;font-weight:bold",
    "",
);
