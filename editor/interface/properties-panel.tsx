import * as protocol from "../protocol.ts";
import { type ComponentChildren, type ComponentType, Fragment } from "preact";
import { type Project, useProject } from "./project.tsx";
import { WorkspacePlaceholder } from "./workspace.tsx";
import { IconLabel, TextLabel } from "./label.tsx";
import { cx } from "./utils.ts";
import { TranslatedTextLabel, useTranslator } from "./translation.tsx";
import { Button, ColorInput, Label, PropertiesTable, Property, PropertyGroup, Slider, TextInput } from "./control.tsx";
import { ElementLabel } from "./labelx.tsx";
import { Tooltip } from "./front-layer.tsx";
import { Menu, MenuButton, OpenDirection } from "./menu.tsx";
import "./properties-panel.css";

export const PropertiesPanel: ComponentType = () => {
    const project = useProject();

    if (project == null) {
        return (
            <WorkspacePlaceholder>
                <TextLabel>Open a project to view its content</TextLabel>
            </WorkspacePlaceholder>
        );
    }

    return <PropertiesPanelContent project={project} />;
};

const PropertiesPanelContent: ComponentType<{ project: Project }> = ({ project }) => {
    const selection = project.useSelection();

    return (
        <div class={cx("nahara-ui-properties-panel")}>
            {selection.target == protocol.SelectionTarget.Project
                ? <ProjectProperties project={project} />
                : selection.target == protocol.SelectionTarget.Element
                ? (selection.elementIds.length == 1
                    ? <ElementProperties project={project} elementId={selection.elementIds[0]} />
                    : null)
                : null}
        </div>
    );
};

const Scaffold: ComponentType<{
    title: ComponentChildren;
}> = ({
    title,
    children,
}) => {
    return (
        <>
            <header>
                <div class={cx("title")}>
                    {title}
                </div>
            </header>
            {children}
        </>
    );
};

const ProjectProperties: ComponentType<{ project: Project }> = ({ project }) => {
    const state = project.useProjectState();

    return (
        <Scaffold
            title={
                <>
                    <IconLabel type="nahara-motion" />
                    {state.name != null
                        ? <TextLabel>{state.name}</TextLabel>
                        : <TranslatedTextLabel tr="unnamedProject" />}
                </>
            }
        >
            <div class={cx("description")}>
                <p>
                    This is your project properties. Select a scene in Project panel to view the scene, or select an
                    option from quick actions below.
                </p>
            </div>
            <div class={cx("actions")}>
                <Button style="bordered">
                    <IconLabel type="scene" />
                    <TranslatedTextLabel tr="addScene" />
                </Button>
                <Button style="bordered">
                    <IconLabel type="library" />
                    <TranslatedTextLabel tr="addDependency" />
                </Button>
                <Button style="bordered">
                    <IconLabel type="folder" />
                    <TranslatedTextLabel tr="addAsset" />
                </Button>
                <Button style="bordered">
                    <IconLabel type="function" />
                    <TranslatedTextLabel tr="addFunction" />
                </Button>
                <Button style="bordered">
                    <IconLabel type="type" />
                    <TranslatedTextLabel tr="addStruct" />
                </Button>
                <Button style="bordered">
                    <IconLabel type="type" />
                    <TranslatedTextLabel tr="addVariant" />
                </Button>
            </div>
            {state.saved ? null : (
                <>
                    <div class={cx("description")}>
                        <p>
                            There are unsaved changes. Don't forget to save your project before quiting.
                        </p>
                    </div>
                    <div class={cx("actions")}>
                        <Button style="bordered">
                            <IconLabel type="save" />
                            <TranslatedTextLabel tr="file.saveProject" />
                        </Button>
                        <Button style="bordered">
                            <IconLabel type="save" />
                            <TranslatedTextLabel tr="file.saveProjectAs" />
                        </Button>
                    </div>
                </>
            )}
        </Scaffold>
    );
};

const ElementProperties: ComponentType<{ project: Project; elementId: string }> = ({ project, elementId }) => {
    const state = project.useProjectState();
    const element = state.elements[elementId];

    return (
        <Scaffold
            title={<ElementLabel kind={element.kind} subtype={element.subtype} name={element.name} />}
        >
            <PropertiesTable>
                <PropertyGroup
                    label={
                        <>
                            <IconLabel type="nahara-motion" />
                            <TranslatedTextLabel tr="elementMetadata" />
                        </>
                    }
                >
                    <Property level={0} label={<TranslatedTextLabel tr="elementName" />}>
                        <TextInput
                            value={element.name ?? ""}
                            onInput={(e) => (project.queueEdit({
                                editType: "element-name",
                                elementId,
                                name: e.currentTarget.value,
                            }))}
                            onFinished={() => project.commitEdit("Change element name")}
                        />
                    </Property>
                    <Property level={0} label={<TranslatedTextLabel tr="elementDescription" />}>
                        <TextInput
                            value={element.description ?? ""}
                            onInput={(e) => (project.queueEdit({
                                editType: "element-description",
                                elementId,
                                description: e.currentTarget.value,
                            }))}
                            onFinished={() => project.commitEdit("Change element description")}
                        />
                    </Property>
                </PropertyGroup>
                {element.kind != protocol.ElementKind.Component ? null : (
                    <ComponentPropertyGroup
                        project={project}
                        componentId={elementId}
                        component={element}
                    />
                )}
            </PropertiesTable>
        </Scaffold>
    );
};

const ComponentPropertyGroup: ComponentType<{
    project: Project;
    componentId: string;
    component: protocol.ComponentElement;
}> = ({
    project,
    componentId,
    component,
}) => {
    return (
        <>
            <PropertyGroup
                label={
                    <>
                        <IconLabel type="component" />
                        <TranslatedTextLabel tr="componentMetadata" />
                    </>
                }
            >
                <Property level={0} label={<TranslatedTextLabel tr="componentSubtype" />}>
                    <Menu
                        style="bordered"
                        label={
                            <>
                                {component.subtype != null ? null : <IconLabel type="component" />}
                                {component.subtype != "scene" ? null : <IconLabel type="scene" />}
                                {component.subtype == null
                                    ? <TranslatedTextLabel tr="subtype.none" />
                                    : <TranslatedTextLabel tr={"subtype." + component.subtype} />}
                            </>
                        }
                    >
                        <MenuButton enabled onClick={() => {}}>
                            <IconLabel type="component" />
                            <TranslatedTextLabel tr="subtype.none" />
                        </MenuButton>
                        <MenuButton enabled onClick={() => {}}>
                            <IconLabel type="scene" />
                            <TranslatedTextLabel tr="subtype.scene" />
                        </MenuButton>
                    </Menu>
                </Property>
                <Property level={0} label={<TranslatedTextLabel tr="componentExtra" />}>
                    <Label>
                        <TranslatedTextLabel tr="noComponentExtra" />
                    </Label>
                    <Tooltip tooltip={<TranslatedTextLabel tr="addComponentExtra" />}>
                        <Menu style="bordered" label={<IconLabel type="add" />} dirOverride={OpenDirection.Down.Left}>
                            <MenuButton enabled onClick={() => {}}>
                                <IconLabel type="transition" />
                                <TranslatedTextLabel tr="extra.transition" />
                            </MenuButton>
                            <MenuButton enabled onClick={() => {}}>
                                <IconLabel type="slideshow" />
                                <TranslatedTextLabel tr="extra.slideshow" />
                            </MenuButton>
                        </Menu>
                    </Tooltip>
                </Property>
            </PropertyGroup>
            {component.subtype != "scene" ? null : (
                <ScenePropertyGroup
                    project={project}
                    sceneId={componentId}
                    scene={component}
                />
            )}
        </>
    );
};

const ScenePropertyGroup: ComponentType<{
    project: Project;
    sceneId: string;
    scene: protocol.ComponentElement;
}> = ({
    project,
    sceneId,
    scene,
}) => {
    const sceneState = project.useSceneState();
    const translator = useTranslator();

    function toggleCamera(cameraId: string) {
        if (sceneState != null && sceneState.cameraId == cameraId) project.activateCamera(null);
        else project.activateCamera(cameraId);
    }

    return (
        <PropertyGroup
            label={
                <>
                    <IconLabel type="scene" />
                    <TranslatedTextLabel tr="sceneMetadata" />
                </>
            }
        >
            <Property level={0} label={<TranslatedTextLabel tr="cameras" />}>
                <Label>
                    {scene.cameras.length == 0
                        ? <TranslatedTextLabel tr="noCameras" />
                        : <TextLabel>{scene.cameras.length} {translator("unit.camera")}</TextLabel>}
                </Label>
                <Tooltip tooltip={<TranslatedTextLabel tr="addCamera" />}>
                    <Button style="bordered">
                        <IconLabel type="add" />
                    </Button>
                </Tooltip>
            </Property>
            {scene.cameras.map((camera) => (
                <Fragment key={camera.id}>
                    <Property level={1} label={<TextLabel>{camera.id}</TextLabel>}>
                        <TextInput
                            value={camera.name ?? ""}
                            onInput={(e) => (project.queueEdit({
                                editType: "camera-name",
                                sceneId,
                                cameraId: camera.id,
                                name: e.currentTarget.value,
                            }))}
                            onFinished={() => project.commitEdit("Change camera name")}
                        />
                        <Button
                            style="bordered"
                            state={sceneState == null || sceneState.sceneId != sceneId
                                ? "disabled"
                                : sceneState.cameraId == camera.id
                                ? "activated"
                                : "normal"}
                            onClick={() => toggleCamera(camera.id)}
                        >
                            <TranslatedTextLabel tr="activateCamera" />
                        </Button>
                        <Menu
                            style="bordered"
                            label={<IconLabel type="options" />}
                            dirOverride={OpenDirection.Down.Left}
                        >
                            <MenuButton
                                enabled
                                onClick={() => (project.edit({
                                    label: "Delete camera",
                                    editType: "delete-camera",
                                    sceneId,
                                    cameraId: camera.id,
                                }))}
                            >
                                <TranslatedTextLabel tr="delete" />
                            </MenuButton>
                        </Menu>
                    </Property>
                    <Property level={2} label={<TranslatedTextLabel tr="framebufferWidth" />}>
                        <Slider
                            value={camera.width}
                            label={(x) => <TextLabel>{Math.floor(x)} {translator("unit.pixel")}</TextLabel>}
                            step={1}
                            countsPerPage={100}
                            min={1}
                            onInput={(width) => (project.queueEdit({
                                editType: "camera-width",
                                sceneId,
                                cameraId: camera.id,
                                width,
                            }))}
                            onFinished={() => project.commitEdit("Change camera width")}
                        />
                    </Property>
                    <Property level={2} label={<TranslatedTextLabel tr="framebufferHeight" />}>
                        <Slider
                            value={camera.height}
                            label={(x) => <TextLabel>{Math.floor(x)} {translator("unit.pixel")}</TextLabel>}
                            step={1}
                            countsPerPage={100}
                            min={1}
                            onInput={(height) => (project.queueEdit({
                                editType: "camera-height",
                                sceneId,
                                cameraId: camera.id,
                                height,
                            }))}
                            onFinished={() => project.commitEdit("Change camera height")}
                        />
                    </Property>
                    <Property level={2} label={<TranslatedTextLabel tr="background" />}>
                        {camera.background == null
                            ? (
                                <Button
                                    style="bordered"
                                    onClick={() => (project.edit({
                                        label: "Add background color",
                                        editType: "camera-background",
                                        sceneId,
                                        cameraId: camera.id,
                                        background: [0, 0, 0],
                                    }))}
                                >
                                    <IconLabel type="add" />
                                    <TranslatedTextLabel tr="addColor" />
                                </Button>
                            )
                            : (
                                <>
                                    <ColorInput value={camera.background} />
                                    <Button
                                        style="bordered"
                                        onClick={() => (project.edit({
                                            label: "Remove background color",
                                            editType: "camera-background",
                                            sceneId,
                                            cameraId: camera.id,
                                            background: null,
                                        }))}
                                    >
                                        <TranslatedTextLabel tr="clear" />
                                    </Button>
                                </>
                            )}
                    </Property>
                </Fragment>
            ))}
        </PropertyGroup>
    );
};
