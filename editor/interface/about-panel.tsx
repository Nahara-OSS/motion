import type { ComponentType } from "preact";
import { cx } from "./utils.ts";
import { MotionBranding, NaharaBranding } from "./branding.tsx";
import "./about-panel.css";

export const AboutPanel: ComponentType = ({ children }) => {
    return (
        <div class={cx("nahara-ui-about-panel")}>
            {children}
        </div>
    );
};

export const AboutMotionPanel: ComponentType = () => {
    return (
        <AboutPanel>
            <div class={cx("branding")}>
                <MotionBranding />
            </div>
            <div class={cx("separator")} />
            <p>
                A modular approach to motion graphics.
            </p>
        </AboutPanel>
    );
};

export const AboutNaharaPanel: ComponentType = () => {
    return (
        <AboutPanel>
            <div class={cx("branding")}>
                <NaharaBranding />
            </div>
            <div class={cx("separator")} />
        </AboutPanel>
    );
};
