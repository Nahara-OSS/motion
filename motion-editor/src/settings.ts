import type { Language } from "./i18n.ts";

export interface Settings {
    readonly general: {
        /**
         * App-wide language.
         *
         * `auto` picks the language from `navigator.language`.
         */
        readonly language: "auto" | Language;

        /**
         * Clock nibble style.
         *
         * Besides from HH:MM:SS display, there's also a small number display that shows a portion of a second.
         *
         * - `ms`: Display milliseconds;
         * - `frame`: Display current frame (out of maximum number of frames) in one second;
         * - `tick`: Display current tick.
         */
        readonly clockStyle: "ms" | "frame" | "tick";
    };

    readonly accessiblity: {
        /**
         * Maximum amount of time between 2 consecutive clicks to consider as double click.
         */
        readonly doubleClickTime: number;
    };
}

export const Settings: Settings = {
    general: {
        language: "auto",
        clockStyle: "ms",
    },

    accessiblity: {
        doubleClickTime: 500,
    },
};
