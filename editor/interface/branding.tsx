import type { ComponentType } from "preact";
import { cx } from "./utils.ts";
import "./branding.css";

export const MotionBranding: ComponentType = () => {
    return (
        <div class={cx("nahara-ui-branding", "nahara-motion")}>
            <svg class={cx("logo")} viewBox="32 32 116 116">
                <use href="./app-icon-color.svg" />
            </svg>
            <div class={cx("text")}>
                <span>Nahara's</span>
                <br />
                <span>Motion</span>
            </div>
        </div>
    );
};

export const NaharaBranding: ComponentType = () => {
    return (
        <div class={cx("nahara-ui-branding", "nahara-organization")}>
            <svg class={cx("logo")} viewBox="32 32 116 116">
                <use href="./org-logo.svg" />
            </svg>
            <div class={cx("text")}>
                <span>Nahara's</span>
                <br />
                <span>Organization</span>
            </div>
        </div>
    );
};
