import * as protocol from "../protocol.ts";
import type { ComponentType } from "preact";
import { type Project, useProject } from "./project.tsx";
import { WorkspacePlaceholder } from "./workspace.tsx";
import { FillLabel, IconLabel, TextLabel } from "./label.tsx";
import { cx, select, SelectMode } from "./utils.ts";
import { Button } from "./control.tsx";
import { TranslatedTextLabel } from "./translation.tsx";
import { Tooltip } from "./front-layer.tsx";
import { ElementLabel, ProjectLabel } from "./labelx.tsx";
import "./project-panel.css";

export const ProjectPanel: ComponentType = () => {
    const project = useProject();

    if (project == null) {
        return (
            <WorkspacePlaceholder>
                <TextLabel>Open a project to view its content</TextLabel>
            </WorkspacePlaceholder>
        );
    }

    return <ProjectPanelContent project={project} />;
};

const ProjectPanelContent: ComponentType<{ project: Project }> = ({ project }) => {
    const state = project.useProjectState();
    const sceneState = project.useSceneState();
    const selection = project.useSelection();

    const elements = Object
        .entries(state.elements)
        .sort((a, b) => {
            if (a[1].name == b[1].name) return a[1].ordinal - b[1].ordinal;
            if (a[1].name == null) return -1;
            if (b[1].name == null) return +1;
            return a[1].name.localeCompare(b[1].name);
        });
    const dependencies = Object
        .entries(state.dependencies)
        .sort((a, b) => {
            const aa = a[1].name ?? a[0];
            const bb = b[1].name ?? b[0];
            return aa.localeCompare(bb);
        });

    function onElementSelect(e: MouseEvent, elementId: string) {
        const currentIds = selection.target == protocol.SelectionTarget.Element ? selection.elementIds : [];
        const mode = e.ctrlKey ? SelectMode.Multiple : e.shiftKey ? SelectMode.Range : SelectMode.Single;
        project.selectElement(select(currentIds, elementId, mode));

        if (mode == SelectMode.Single && state.elements[elementId].kind == protocol.ElementKind.Component) {
            project.openScene(elementId);
        }
    }

    return (
        <div class={cx("nahara-ui-project-panel")}>
            <ProjectTreeLeaf level={0}>
                <Button
                    style="generic"
                    state={selection.target == protocol.SelectionTarget.Project ? "activated" : "normal"}
                    onClick={() => project.selectProject()}
                >
                    <ProjectLabel name={state.name} />
                </Button>
                <Tooltip tooltip={<TranslatedTextLabel tr="addElement" />}>
                    <Button style="generic">
                        <IconLabel type="add" />
                    </Button>
                </Tooltip>
            </ProjectTreeLeaf>
            {elements.map(([elementId, { name, kind, subtype }]) => (
                <ProjectTreeLeaf key={elementId} level={1}>
                    <Button
                        style="generic"
                        onClick={(e) => onElementSelect(e, elementId)}
                        state={(
                                selection.target == protocol.SelectionTarget.Element &&
                                selection.elementIds.includes(elementId)
                            )
                            ? "activated"
                            : "normal"}
                    >
                        <ElementLabel
                            name={name}
                            kind={kind}
                            subtype={subtype}
                        />
                        {sceneState != null && sceneState.sceneId == elementId
                            ? (
                                <>
                                    <FillLabel />
                                    <TranslatedTextLabel tr="activeComponent" alt />
                                </>
                            )
                            : null}
                    </Button>
                </ProjectTreeLeaf>
            ))}
            <ProjectTreeLeaf level={0}>
                <Button style="generic">
                    <IconLabel type="library" />
                    <TranslatedTextLabel tr="dependencies" />
                </Button>
                <Tooltip tooltip={<TranslatedTextLabel tr="addDependency" />}>
                    <Button style="generic">
                        <IconLabel type="add" />
                    </Button>
                </Tooltip>
            </ProjectTreeLeaf>
            {dependencies.map(([moduleId, { name }]) => (
                <ProjectTreeLeaf key={moduleId} level={1}>
                    <Button style="generic">
                        <IconLabel type="book" />
                        <TextLabel>{name}</TextLabel>
                    </Button>
                </ProjectTreeLeaf>
            ))}
            <ProjectTreeLeaf level={0}>
                <Button style="generic">
                    <IconLabel type="folder" />
                    <TranslatedTextLabel tr="assets" />
                </Button>
                <Tooltip tooltip={<TranslatedTextLabel tr="addAsset" />}>
                    <Button style="generic">
                        <IconLabel type="add" />
                    </Button>
                </Tooltip>
            </ProjectTreeLeaf>
        </div>
    );
};

const ProjectTreeLeaf: ComponentType<{ level: number }> = ({ level, children }) => {
    return (
        <div class={cx("nahara-ui-project-item")} style={{ "--level": level }}>
            {children}
        </div>
    );
};
