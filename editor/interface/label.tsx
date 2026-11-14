/**
 * Label components
 *
 * Labels have 1.8em height and are meant to be used inside components like button or slider.
 *
 * @module
 */

import type { ComponentType } from "preact";
import { cx } from "./utils.ts";
import "./label.css";

export const TextLabel: ComponentType<{ alt?: boolean }> = ({ alt = false, children }) => {
    return (
        <span class={cx("nahara-ui-text-label", { alt })}>
            {children}
        </span>
    );
};

export const DotLabel: ComponentType = () => <TextLabel>&bull;</TextLabel>;

export const KeyLabel: ComponentType = ({ children }) => {
    return (
        <span className="nahara-ui-key-label">
            {children}
        </span>
    );
};

export const IconLabel: ComponentType<{ type: IconLabel }> = ({ type }) => {
    return (
        <svg className="nahara-ui-icon-label" viewBox="0 0 20 20">
            <use href={`./icons.svg#${type}`} />
        </svg>
    );
};

export type IconLabel =
    | "add"
    | "book"
    | "checked"
    | "circle"
    | "close"
    | "cursor"
    | "component"
    | "doll"
    | "file"
    | "freehand"
    | "folder"
    | "function"
    | "library"
    | "module"
    | "nahara-motion"
    | "options"
    | "path"
    | "picture"
    | "save"
    | "scene"
    | "shapes"
    | "slideshow"
    | "space"
    | "square"
    | "transition"
    | "type";

export const FillLabel: ComponentType = () => {
    return <span class={cx("nahara-ui-fill-label")} />;
};

export const ColorLabel: ComponentType<{ color: string }> = ({ color }) => {
    return <span class={cx("nahara-ui-color-label")} style={{ backgroundColor: color }} />;
};
