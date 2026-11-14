import * as protocol from "../protocol.ts";
import type { ComponentType, TargetedPointerEvent } from "preact";
import { cx } from "./utils.ts";
import { TranslatedKeyLabel, TranslatedTextLabel } from "./translation.tsx";
import { MotionBranding } from "./branding.tsx";
import { Button } from "./control.tsx";
import { IconLabel, TextLabel } from "./label.tsx";
import { Tooltip } from "./front-layer.tsx";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { type Project, useProject } from "./project.tsx";
import { triggerCommand } from "./command.tsx";
import { sendKeyInput } from "./keybind.tsx";
import { useEditor } from "./editor.tsx";
import "./viewport-panel.css";
import "./common.css";

export const ViewportPanel: ComponentType = () => {
    const project = useProject();

    return (
        <div class={cx("nahara-ui-viewport-panel")}>
            {project == null ? <NoProjectContent /> : <ViewportPanelContent project={project} />}
        </div>
    );
};

const quickActions = [
    protocol.CommandIds.NewProject,
    protocol.CommandIds.OpenProject,
    protocol.CommandIds.AppSettings,
];

const exploreActions = [
    protocol.CommandIds.Tutorials,
    protocol.CommandIds.OnlineManual,
];

const NoProjectContent: ComponentType = () => {
    return (
        <div class={cx("no-project")}>
            <div class={cx("branding")}>
                <MotionBranding />
            </div>
            <div class={cx("separator")} aria-hidden />
            <div class={cx("grid")}>
                <div class={cx("cell")}>
                    <h1>Quick actions</h1>
                    {quickActions.map((commandId) => (
                        <Button
                            style="generic"
                            onClick={() => (triggerCommand({
                                commandId,
                                state: protocol.CommandState.OneShot,
                                extra: {},
                            }))}
                        >
                            <TranslatedTextLabel tr={commandId} />
                        </Button>
                    ))}
                </div>
                <div class={cx("cell")}>
                    <h1>Recent projects</h1>
                </div>
                <div class={cx("cell")}>
                    <h1>Explore</h1>
                    {exploreActions.map((commandId) => (
                        <Button
                            style="generic"
                            onClick={() => (triggerCommand({
                                commandId,
                                state: protocol.CommandState.OneShot,
                                extra: {},
                            }))}
                        >
                            <TranslatedTextLabel tr={commandId} />
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ViewportPanelContent: ComponentType<{ project: Project }> = ({ project }) => {
    const sceneState = project.useSceneState();

    return (
        <div class={cx("has-project")}>
            <ViewportCanvas project={project} />
            <GizmoOverlay project={project} />
            <ToolbarsOverlay project={project} />
            {sceneState != null ? null : (
                <div class={cx("overlay")}>
                    <TextLabel>Open a scene to view in this viewport</TextLabel>
                </div>
            )}
        </div>
    );
};

const ViewportCanvas: ComponentType<{ project: Project }> = ({ project }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // we have to use useLayoutEffect() here because ResizeObserver was calling
    // our callback when the canvas is removed from the DOM when using
    // useEffect()
    useLayoutEffect(() => {
        if (canvasRef.current == null) return;
        const canvas = canvasRef.current;

        const resizeObserver = new ResizeObserver(() => {
            const bounds = canvas.getBoundingClientRect();
            const width = bounds.width * devicePixelRatio;
            const height = bounds.height * devicePixelRatio;
            project.updateCanvas(width, height);
        });

        const bounds = canvas.getBoundingClientRect();
        const width = bounds.width * devicePixelRatio;
        const height = bounds.height * devicePixelRatio;
        const offscreenCanvas = canvas.transferControlToOffscreen();
        project.sendCanvas(offscreenCanvas, width, height);
        resizeObserver.observe(canvas);

        return () => {
            project.dropCanvas();
            resizeObserver.disconnect();
        };
    }, [project]);

    function onPointerDown(e: TargetedPointerEvent<HTMLCanvasElement>) {
        const { left, top } = e.currentTarget.getBoundingClientRect();
        const pointerId = e.pointerId;
        const key = e.pointerType == "mouse"
            ? (e.button == 1
                ? protocol.Key.MouseTernary
                : e.button == 2
                ? protocol.Key.MouseSecondary
                : protocol.Key.MousePrimary)
            : e.pointerType == "pen"
            ? protocol.Key.StylusPen
            : protocol.Key.MousePrimary;
        const ctrl = e.ctrlKey;
        const alt = e.altKey;
        const shift = e.shiftKey;

        if (
            !sendKeyInput({
                combination: { key, ctrl, alt, shift },
                state: protocol.CommandState.Down,
                extra: { viewport: { px: e.clientX - left, py: e.clientY - top } },
            })
        ) return;

        function onPointerMove(e: PointerEvent) {
            if (e.pointerId != pointerId) return;
            sendKeyInput({
                combination: { key, ctrl, alt, shift },
                state: protocol.CommandState.Hold,
                extra: { viewport: { px: e.clientX - left, py: e.clientY - top } },
            });
            e.preventDefault();
        }

        function onPointerUp(e: PointerEvent) {
            if (e.pointerId != pointerId) return;
            sendKeyInput({
                combination: { key, ctrl, alt, shift },
                state: protocol.CommandState.Up,
                extra: { viewport: { px: e.clientX - left, py: e.clientY - top } },
            });
            document.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("pointerup", onPointerUp);
            e.preventDefault();
        }

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
        e.preventDefault();
    }

    return <canvas key={project} onPointerDown={onPointerDown} ref={canvasRef} />;
};

const GizmoOverlay: ComponentType<{ project: Project }> = ({ project }) => {
    const [bounds, setBounds] = useState<DOMRect | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const state = project.useProjectState();
    const sceneState = project.useSceneState();
    const cameras = sceneState == null ? [] : (state.elements[sceneState.sceneId] as protocol.ComponentElement).cameras;
    const activeCamera = sceneState == null ? null : cameras.find((c) => c.id == sceneState.cameraId);

    useLayoutEffect(() => {
        if (svgRef.current == null) return;
        const svg = svgRef.current;
        const resizeObserver = new ResizeObserver(() => setBounds(svg.getBoundingClientRect()));
        resizeObserver.observe(svg);
        setBounds(svg.getBoundingClientRect());
        return () => resizeObserver.disconnect();
    }, []);

    function calcX(x: number): number {
        if (bounds == null) return x;
        return x / devicePixelRatio + bounds.width / 2;
    }

    function calcY(y: number): number {
        if (bounds == null) return y;
        return y / devicePixelRatio + bounds.height / 2;
    }

    function calcSize(w: number): number {
        if (bounds == null) return w;
        return w / devicePixelRatio;
    }

    return (
        <svg class={cx("gizmo")} ref={svgRef}>
            {bounds == null ? null : (
                <>
                    {activeCamera != null ? null : cameras.map((camera) => (
                        <>
                            <rect
                                key={camera.id}
                                class={cx("camera-bounds")}
                                x={calcX(-camera.width / 2)}
                                y={calcY(-camera.height / 2)}
                                width={calcSize(camera.width)}
                                height={calcSize(camera.height)}
                            />
                            <text
                                x={calcX(-camera.width / 2)}
                                y={calcY(-camera.height / 2)}
                                class={cx("camera-label")}
                            >
                                {camera.name ?? camera.id}
                            </text>
                        </>
                    ))}
                    {activeCamera == null ? null : (
                        <path
                            class={cx("camera-region")}
                            d={[
                                `M 0,0 H ${bounds.width} V${bounds.height} H 0 Z`,
                                `M ${calcX(-activeCamera.width / 2)},${calcY(-activeCamera.height / 2)}`,
                                `v ${calcSize(activeCamera.height)}`,
                                `h ${calcSize(activeCamera.width)}`,
                                `v ${calcSize(-activeCamera.height)}`,
                                "Z",
                            ].join("")}
                        />
                    )}
                </>
            )}
        </svg>
    );
};

const tools: readonly {
    readonly commandId: string;
    readonly icon: IconLabel;
    readonly subtools: readonly {
        readonly commandId: string;
        readonly icon: IconLabel;
        readonly tool: protocol.Tool;
    }[];
}[] = [
    {
        commandId: protocol.CommandIds.SelectTool,
        icon: "cursor",
        subtools: [
            {
                commandId: protocol.CommandIds.SelectTool,
                icon: "cursor",
                tool: protocol.Tool.Select,
            },
        ],
    },
    {
        commandId: protocol.CommandIds.ShapeTool,
        icon: "shapes",
        subtools: [
            {
                commandId: protocol.CommandIds.RectShapeTool,
                icon: "square",
                tool: protocol.Tool.RectShape,
            },
            {
                commandId: protocol.CommandIds.CircleShapeTool,
                icon: "circle",
                tool: protocol.Tool.CircleShape,
            },
        ],
    },
    {
        commandId: protocol.CommandIds.DrawTool,
        icon: "nahara-motion",
        subtools: [
            {
                commandId: protocol.CommandIds.PenDrawTool,
                icon: "path",
                tool: protocol.Tool.PenDraw,
            },
            {
                commandId: protocol.CommandIds.FreehandDrawTool,
                icon: "freehand",
                tool: protocol.Tool.FreehandDraw,
            },
        ],
    },
];

const ToolbarsOverlay: ComponentType<{ project: Project }> = ({ project }) => {
    const editor = useEditor();
    const [settings] = editor.useSettings();
    const state = project.useProjectState();

    const subtools = tools
        .find((t) => t.subtools.some((st) => st.tool == state.toolbox.current))
        ?.subtools ?? [];

    return (
        <div class={cx("toolbars")}>
            <div class={cx("toolbar")}>
                {tools.map((tool) => (
                    <Tooltip
                        key={tool.commandId}
                        tooltip={
                            <>
                                <TranslatedTextLabel tr={tool.commandId} />
                                {(settings.keyBinds[tool.commandId] ?? []).map((key, i) => (
                                    <TranslatedKeyLabel key={i} value={key} />
                                ))}
                            </>
                        }
                    >
                        <Button
                            style="generic"
                            state={tool.subtools.some((st) => st.tool == state.toolbox.current)
                                ? "activated"
                                : "normal"}
                            onClick={() => (triggerCommand({
                                commandId: tool.commandId,
                                state: protocol.CommandState.OneShot,
                                extra: {},
                            }))}
                        >
                            <IconLabel type={tool.icon} />
                        </Button>
                    </Tooltip>
                ))}
            </div>
            {subtools.length <= 1 ? null : (
                <div class={cx("toolbar")}>
                    {subtools.map((st) => (
                        <Tooltip
                            key={st.commandId}
                            tooltip={
                                <>
                                    <TranslatedTextLabel tr={st.commandId} />
                                    {(settings.keyBinds[st.commandId] ?? []).map((key, i) => (
                                        <TranslatedKeyLabel key={i} value={key} />
                                    ))}
                                </>
                            }
                        >
                            <Button
                                style="generic"
                                state={state.toolbox.current == st.tool ? "activated" : "normal"}
                                onClick={() => (triggerCommand({
                                    commandId: st.commandId,
                                    state: protocol.CommandState.OneShot,
                                    extra: {},
                                }))}
                            >
                                <IconLabel type={st.icon} />
                            </Button>
                        </Tooltip>
                    ))}
                </div>
            )}
        </div>
    );
};
