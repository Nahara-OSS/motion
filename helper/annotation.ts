import * as motion from "@nahara/motion";

const Ty = motion.annotation.AnnotationType;

export interface Editor {
    readonly name: string | null;
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
            name: input.entries.name?.type == Ty.String ? input.entries.name.value : null,
            description: input.entries.description?.type == Ty.String ? input.entries.description.value : null,
        };
    },

    toAnnotation: ({ name, description }) => ({
        name: Editor.name,
        entries: {
            ...(name == null ? {} : { name: { type: Ty.String, value: name } }),
            ...(description == null ? {} : { description: { type: Ty.String, value: description } }),
        },
    }),
};

export interface Scene {
    readonly width: number;
    readonly height: number;
    readonly background: readonly [r: number, g: number, b: number];
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
        background: [0, 0, 0],
    },

    parse: (input) => {
        if (input.name != Scene.name) return null;
        if (input.entries.width?.type != Ty.Number) return null;
        if (input.entries.height?.type != Ty.Number) return null;
        if (input.entries.background?.type != Ty.List) return null;

        const background = input.entries.background.values;
        if (background.length != 3) return null;
        if (background[0].type != Ty.Number) return null;
        if (background[1].type != Ty.Number) return null;
        if (background[2].type != Ty.Number) return null;

        return {
            width: input.entries.width.value,
            height: input.entries.height.value,
            background: [
                background[0].value,
                background[1].value,
                background[2].value,
            ],
        };
    },

    toAnnotation: ({ width, height, background }) => ({
        name: Scene.name,
        entries: {
            width: { type: Ty.Number, value: width },
            height: { type: Ty.Number, value: height },
            background: {
                type: Ty.List,
                values: [
                    { type: Ty.Number, value: background[0] },
                    { type: Ty.Number, value: background[1] },
                    { type: Ty.Number, value: background[2] },
                ],
            },
        },
    }),
};
