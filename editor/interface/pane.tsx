import type { ComponentChildren, ComponentType } from "preact";
import "./pane.css";

export const Pane: ComponentType<{
    title?: ComponentChildren;
}> = ({
    title,
    children,
}) => {
    return (
        <div className="nahara-pane">
            <header>
                <div className="title">{title}</div>
            </header>
            <main>
                {children}
            </main>
        </div>
    );
};
