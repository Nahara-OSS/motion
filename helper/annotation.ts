import type * as motion from "@nahara/motion";

export type Rgb = readonly [r: number, g: number, b: number];

export const Rgb: {
    readonly parse: (input: motion.annotation.AnnotationElement) => Rgb | null;
    readonly toAnnotation: (data: Rgb) => motion.annotation.AnnotationElement;
} = {
    parse: (input) => {
        if (input.kind != "list") return null;
        if (input.values.length != 3) return null;
        if (input.values[0].kind != "number") return null;
        if (input.values[1].kind != "number") return null;
        if (input.values[2].kind != "number") return null;

        return [
            input.values[0].value,
            input.values[1].value,
            input.values[2].value,
        ];
    },
    toAnnotation: ([r, g, b]) => ({
        kind: "list",
        values: [
            { kind: "number", value: r },
            { kind: "number", value: g },
            { kind: "number", value: b },
        ],
    }),
};

export interface Editor {
    readonly name: string | null;
    readonly description: string | null;
    readonly icon: string | null;
    readonly subtype: string | null;
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
        icon: null,
        subtype: null,
    },
    parse: (input) => {
        if (input.name != Editor.name) return null;

        return {
            name: input.entries.name?.kind == "string" ? input.entries.name.value : null,
            description: input.entries.description?.kind == "string" ? input.entries.description.value : null,
            icon: input.entries.icon?.kind == "string" ? input.entries.icon.value : null,
            subtype: input.entries.subtype?.kind == "string" ? input.entries.subtype.value : null,
        };
    },
    toAnnotation: ({ name, description, icon, subtype }) => ({
        name: Editor.name,
        entries: {
            ...(name == null ? {} : { name: { kind: "string", value: name } }),
            ...(description == null ? {} : { description: { kind: "string", value: description } }),
            ...(icon == null ? {} : { icon: { kind: "string", value: icon } }),
            ...(subtype == null ? {} : { subtype: { kind: "string", value: subtype } }),
        },
    }),
};

export interface Camera {
    readonly id: string;
    readonly name: string | null;
    readonly width: number;
    readonly height: number;
    readonly background: Rgb | null;
}

export const Camera: {
    readonly name: string;
    readonly parse: (input: motion.annotation.Annotation) => Camera | null;
    readonly toAnnotation: (data: Camera) => motion.annotation.Annotation;
} = {
    name: "camera",
    parse: (input) => {
        if (input.name != Camera.name) return null;
        if (input.entries.id?.kind != "string") return null;
        if (input.entries.width?.kind != "number") return null;
        if (input.entries.height?.kind != "number") return null;

        return {
            id: input.entries.id.value,
            name: input.entries.name?.kind == "string" ? input.entries.name.value : null,
            width: input.entries.width.value,
            height: input.entries.height.value,
            background: "background" in input.entries ? Rgb.parse(input.entries.background) : null,
        };
    },
    toAnnotation: ({ id, name, width, height, background }) => ({
        name: Camera.name,
        entries: {
            id: { kind: "string", value: id },
            ...(name == null ? {} : { name: { kind: "string", value: name } }),
            ...(width == null ? {} : { width: { kind: "number", value: width } }),
            ...(height == null ? {} : { height: { kind: "number", value: height } }),
            ...(background == null ? {} : { background: Rgb.toAnnotation(background) }),
        },
    }),
};

/**
 * Mark component as transition
 *
 * Transition have 2 sides: side A is the clip to transition from, and side B is the clip to transition into. The
 * component would mix these 2 sides to connect 2 clips seemlessly.
 */
export interface Transition {
    readonly progressParameter: string;
    readonly slotA: string;
    readonly slotB: string;
}

/**
 * Mark component as slide show
 *
 * Slides are sorted in clicking order (rather than by slide's timestamp).
 */
export interface Slideshow {
    readonly timelineParameter: string;
    readonly slides: readonly Slide[];
}

/**
 * Represent a slide
 */
export interface Slide {
    readonly at: number;
    readonly keySlide: boolean;
}
