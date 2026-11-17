import type * as motion from "@nahara/motion";

/**
 * Include editor-only data to module source
 */
export interface Editor {
    /**
     * Display name
     */
    readonly name: string | null;

    /**
     * Description
     */
    readonly description: string | null;
}

export const Editor: {
    readonly name: string;
    readonly default: Editor;
    readonly parse: (input: motion.annotation.Annotation) => Editor | null;
    readonly toAnnotation: (data: Editor) => motion.annotation.Annotation;
} = {
    name: "editor",
    default: {
        name: null,
        description: null,
    },
    parse: (input) => {
        if (input.name != Editor.name) return null;

        return {
            name: input.entries.name?.kind == "string" ? input.entries.name.value : null,
            description: input.entries.description?.kind == "string" ? input.entries.description.value : null,
        };
    },
    toAnnotation: ({ name, description }) => ({
        name: Editor.name,
        entries: {
            ...(name == null ? {} : { name: { kind: "string", value: name } }),
            ...(description == null ? {} : { description: { kind: "string", value: description } }),
        },
    }),
};

/**
 * Mark component as scene
 */
export interface Scene {
    /**
     * Framebuffer width of the scene
     */
    readonly width: number;

    /**
     * Framebuffer height of the scene
     */
    readonly height: number;
}

export const Scene: {
    readonly name: string;
    readonly default: Scene;
    readonly parse: (input: motion.annotation.Annotation) => Scene | null;
    readonly toAnnotation: (data: Scene) => motion.annotation.Annotation;
} = {
    name: "scene",
    default: {
        width: 1920,
        height: 1080,
    },
    parse: (input) => {
        if (input.entries.width?.kind != "number") return null;
        if (input.entries.height?.kind != "number") return null;

        return {
            width: input.entries.width.value,
            height: input.entries.height.value,
        };
    },
    toAnnotation: ({ width, height }) => ({
        name: Scene.name,
        entries: {
            width: { kind: "number", value: width },
            height: { kind: "number", value: height },
        },
    }),
};

/**
 * Mark parameter as timeline
 *
 * Parameters annotated with `@timeline` are shown as timeline inside Timeline panel and tooling can use this to
 * automatically provide playback time to the component.
 */
export interface Timeline {
    /**
     * Timeline type
     *
     * See {@link Timeline.Type} for a list of timeline types.
     */
    readonly type: string;

    /**
     * Playback rate
     *
     * For some timeline types, this affect the speed of playback, while other timeline types (e.g. scroll progress) are
     * not affected by playback rate.
     */
    readonly rate: number;

    /**
     * Timeline duration
     *
     * `null` indicate the timeline is infinitely long.
     */
    readonly duration: number | null;
}

export const Timeline: {
    readonly name: string;
    readonly default: Timeline;
    readonly Type: {
        readonly PlaybackTime: string;
    };
    readonly parse: (input: motion.annotation.Annotation) => Timeline | null;
    readonly toAnnotation: (data: Timeline) => motion.annotation.Annotation;
} = {
    name: "timeline",
    default: {
        type: "playback-time",
        rate: 1.00,
        duration: null,
    },
    Type: {
        PlaybackTime: "playback-time",
    },
    parse: (input) => {
        if (input.name != Timeline.name) return null;
        if (input.entries.type?.kind != "string") return null;

        return {
            type: input.entries.type.value,
            rate: input.entries.rate?.kind == "number" ? input.entries.rate.value : 1.00,
            duration: input.entries.duration?.kind == "number" ? input.entries.duration.value : null,
        };
    },
    toAnnotation: ({ type, rate, duration }) => ({
        name: Timeline.name,
        entries: {
            type: { kind: "string", value: type },
            ...(rate == 1.00 ? {} : { rate: { kind: "number", value: rate } }),
            ...(duration == null ? {} : { duration: { kind: "number", value: duration } }),
        },
    }),
};
