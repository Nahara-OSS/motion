import { getContext, setContext } from "svelte";

export const Theme: unique symbol = Symbol();

export interface Theme {
    readonly animatorEditor: {
        readonly handleSize: number;
        readonly altHandleSize: number;
    };
}

export function getTheme(): Theme {
    return getContext(Theme);
}

export function withTheme(modifier: (theme: Theme) => Theme): void {
    const theme = getTheme();
    setContext(Theme, modifier(theme));
}
