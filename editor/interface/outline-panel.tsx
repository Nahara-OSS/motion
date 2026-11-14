import type * as protocol from "../protocol.ts";
import { ComponentType } from "preact";
import { Project, useProject, useProjectState } from "./project.tsx";
import { WorkspacePlaceholder } from "./workspace.tsx";
import { TextLabel } from "./label.tsx";
import "./outline-panel.css";

export const OutlinePanel: ComponentType = () => {
    const project = useProject();
    const state = useProjectState();

    if (project == null || state == null || state.scene == null) {
        return (
            <WorkspacePlaceholder>
                <TextLabel>Open a scene to view its content</TextLabel>
            </WorkspacePlaceholder>
        );
    }
};
