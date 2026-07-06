export interface PanelMap {
    /**
     * Project files explorer.
     */
    explorer: object;

    /**
     * Edit history.
     */
    history: object;

    /**
     * Scene outline.
     *
     * Display the objects with tree layout.
     */
    outline: {
        readonly composition: "selected-only" | "all";
    };

    settings: {
        readonly category: "general" | "accessiblity" | "keybinds";
    };

    /**
     * Viewport.
     */
    viewport: object;

    /**
     * Debug panel.
     *
     * This panel will only shows up during development.
     */
    debug: object;
}

export const defaultPanelStates: Record<keyof PanelMap, PanelState> = {
    explorer: {
        type: "explorer",
    },

    history: {
        type: "history",
    },

    outline: {
        type: "outline",
        composition: "selected-only",
    },

    settings: {
        type: "settings",
        category: "general",
    },

    viewport: {
        type: "viewport",
    },

    debug: {
        type: "debug",
    },
} satisfies { [x in keyof PanelMap]: { readonly type: x } & PanelMap[x] };

export type PanelState = { [x in keyof PanelMap]: { readonly type: x } & PanelMap[x] }[keyof PanelMap];
