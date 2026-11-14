import type { ComponentChildren, ComponentType } from "preact";
import { cx } from "./utils.ts";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { IconLabel } from "./label.tsx";
import { Button } from "./control.tsx";
import "./workspace.css";
import { TranslatedTextLabel } from "./translation.tsx";

export interface Workspace {
    readonly panels: Readonly<Record<string, Panel>>;
    readonly groups: Readonly<Record<string, PanelGroup>>;
    readonly floating: readonly FloatingWindow[];
    readonly docked: DockNode;
}

export const Workspace: {
    readonly Default: Workspace;
} = {
    Default: {
        panels: {
            project: { panelType: "project", data: null },
            renderQueue: { panelType: "renderQueue", data: null },
            history: { panelType: "history", data: null },
            outline: { panelType: "outline", data: null },
            timeline: { panelType: "timeline", data: null },
            properties: { panelType: "properties", data: null },
            viewport: { panelType: "viewport", data: null },
        },
        groups: {
            project: { panelIds: ["project", "renderQueue", "history"], active: "project" },
            outline: { panelIds: ["outline"], active: "outline" },
            timeline: { panelIds: ["timeline"], active: "timeline" },
            properties: { panelIds: ["properties"], active: "properties" },
            viewport: { panelIds: ["viewport"], active: "viewport" },
        },
        floating: [],
        docked: {
            kind: "branch",
            primarySide: "row",
            primarySize: 400,
            primary: {
                kind: "branch",
                primarySide: "column-reverse",
                primarySize: 400,
                primary: {
                    kind: "leaf",
                    groupId: "project",
                },
                secondary: {
                    kind: "leaf",
                    groupId: "outline",
                },
            },
            secondary: {
                kind: "branch",
                primarySide: "column-reverse",
                primarySize: 300,
                primary: {
                    kind: "leaf",
                    groupId: "timeline",
                },
                secondary: {
                    kind: "branch",
                    primarySide: "row-reverse",
                    primarySize: 500,
                    primary: {
                        kind: "leaf",
                        groupId: "properties",
                    },
                    secondary: {
                        kind: "leaf",
                        groupId: "viewport",
                    },
                },
            },
        },
    },
};

export interface Panel {
    readonly panelType: string;
    readonly data: unknown;
}

export interface PanelGroup {
    readonly panelIds: readonly string[];
    readonly active: string;
}

export interface FloatingWindow {
    readonly groupId: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export type DockNode =
    | DockBranch
    | DockLeaf;

export interface DockBranch {
    readonly kind: "branch";
    readonly primarySide: "row" | "column" | "row-reverse" | "column-reverse";
    readonly primarySize: number;
    readonly primary: DockNode;
    readonly secondary: DockNode;
}

export interface DockLeaf {
    readonly kind: "leaf";
    readonly groupId: string;
}

/**
 * Compute areas for docked panel groups
 *
 * @param node Node to compute
 * @param left Left position of bounds
 * @param right Right position of bounds
 * @param top Top position of bounds
 * @param bottom Bottom position of bounds
 * @param gap Gap between docked panels
 */
export function* computePanelGroupAreas(
    node: DockNode,
    left: number,
    right: number,
    top: number,
    bottom: number,
    gap: number,
): Iterable<FloatingWindow, void, void> {
    switch (node.kind) {
        case "branch": {
            const { primarySide, primarySize, primary, secondary } = node;

            switch (primarySide) {
                case "column":
                case "column-reverse": {
                    const pT = primarySide == "column" ? top : bottom - primarySize;
                    const pB = pT + primarySize;
                    const sT = primarySide == "column" ? pB + gap : top;
                    const sB = sT + (bottom - top - primarySize - gap);
                    for (const x of computePanelGroupAreas(primary, left, right, pT, pB, gap)) yield x;
                    for (const x of computePanelGroupAreas(secondary, left, right, sT, sB, gap)) yield x;
                    break;
                }

                case "row":
                case "row-reverse": {
                    const pL = primarySide == "row" ? left : right - primarySize;
                    const pR = pL + primarySize;
                    const sL = primarySide == "row" ? pR + gap : left;
                    const sR = sL + (right - left - primarySize - gap);
                    for (const x of computePanelGroupAreas(primary, pL, pR, top, bottom, gap)) yield x;
                    for (const x of computePanelGroupAreas(secondary, sL, sR, top, bottom, gap)) yield x;
                    break;
                }
            }

            break;
        }

        case "leaf": {
            const { groupId } = node;
            yield { groupId, x: left, y: top, width: right - left, height: bottom - top };
            break;
        }
    }
}

/**
 * If `onChange` is `null`, the workspace layout editing will be disabled.
 */
export const WorkspaceView: ComponentType<{
    workspace: Workspace;
    content?: (panel: Panel, setData: (updater: (data: unknown) => unknown) => void) => ComponentChildren;
    onChange?: ((updater: (workspace: Workspace) => Workspace) => void) | null;
}> = ({
    workspace,
    content = () => <WorkspacePlaceholder />,
    onChange = null,
}) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [gap, setGap] = useState(6);
    const [bounds, setBounds] = useState<DOMRect | null>(null);
    const dockedGroups = useMemo(() => {
        if (bounds == null) return null;
        const { left, right, top, bottom } = bounds;
        const list = [...computePanelGroupAreas(workspace.docked, left, right, top, bottom, gap)]
            .map((w) => ({ ...w, x: w.x - bounds.left, y: w.y - bounds.top }))
            .sort((a, b) => a.y == b.y ? a.x - b.x : a.y - b.y);
        return list;
    }, [workspace.docked, bounds, gap]);

    useEffect(() => {
        if (divRef.current == null) return;
        const div = divRef.current;
        const style = div.computedStyleMap();
        const fontSize = style.get("font-size");
        if (fontSize instanceof CSSUnitValue && fontSize.unit == "px") setGap(fontSize.value * 0.5);
        const resizeObserver = new ResizeObserver(() => setBounds(div.getBoundingClientRect()));
        resizeObserver.observe(div);
        return () => resizeObserver.disconnect();
    }, []);

    function panelLabel(panelId: string): ComponentChildren {
        const panelType = workspace.panels[panelId].panelType;
        return <TranslatedTextLabel tr={panelType} />;
    }

    return (
        <div class={cx("nahara-ui-workspace")} ref={divRef}>
            {(dockedGroups ?? []).map(({ groupId, x, y, width, height }) => (
                <PanelGroup
                    key={groupId}
                    type="docked"
                    panels={workspace.groups[groupId].panelIds}
                    active={workspace.groups[groupId].active}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    panelLabel={panelLabel}
                    onOpenPanel={onChange == null ? null : (panelId) => (onChange((ws) => ({
                        ...ws,
                        groups: {
                            ...ws.groups,
                            [groupId]: {
                                ...ws.groups[groupId],
                                active: panelId,
                            },
                        },
                    })))}
                >
                    {content(
                        workspace.panels[workspace.groups[groupId].active],
                        () => {}, // TODO:
                    )}
                </PanelGroup>
            ))}
            {workspace.floating.map(({ groupId, x, y, width, height }) => (
                <PanelGroup
                    key={groupId}
                    type="floating"
                    panels={workspace.groups[groupId].panelIds}
                    active={workspace.groups[groupId].active}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    panelLabel={panelLabel}
                    onOpenPanel={onChange == null ? null : (panelId) => (onChange((ws) => ({
                        ...ws,
                        groups: {
                            ...ws.groups,
                            [groupId]: {
                                ...ws.groups[groupId],
                                active: panelId,
                            },
                        },
                    })))}
                >
                    {content(
                        workspace.panels[workspace.groups[groupId].active],
                        () => {}, // TODO:
                    )}
                </PanelGroup>
            ))}
        </div>
    );
};

const PanelGroup: ComponentType<{
    type: "docked" | "floating";
    panels: readonly string[];
    active: string;
    x: number;
    y: number;
    width: number;
    height: number;
    panelLabel: (panelId: string) => ComponentChildren;
    onOpenPanel?: ((panelId: string) => void) | null;
    onCloseGroup?: (() => void) | null;
    onClosePanel?: ((panelId: string) => void) | null;
}> = ({
    type,
    panels,
    active,
    x,
    y,
    width,
    height,
    panelLabel,
    onOpenPanel,
    onCloseGroup,
    onClosePanel,
    children,
}) => {
    return (
        <div
            class={cx("nahara-ui-panel-group", type)}
            style={{
                left: `${x}px`,
                top: `${y}px`,
                right: `calc(100% - ${x}px - ${width}px)`,
                bottom: `calc(100% - ${y}px - ${height}px)`,
            }}
        >
            <header>
                <div class={cx("titlebar")}>
                    <div class={cx("tabs")}>
                        {panels.map((panelId) => (
                            <div
                                key={panelId}
                                class={cx("tab", { active: active == panelId })}
                                role="tab"
                                tabIndex={0}
                                onPointerDown={onOpenPanel == null ? undefined : () => {
                                    // TODO: drag and drop
                                    onOpenPanel(panelId);
                                }}
                            >
                                <div class={cx("label")}>{panelLabel(panelId)}</div>
                                {!onClosePanel || panels.length == 1 ? null : (
                                    <Button
                                        style="generic"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onClosePanel(panelId);
                                        }}
                                    >
                                        <IconLabel type="close" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                    {!onCloseGroup ? null : (
                        <div class={cx("controls")}>
                            <Button style="generic" onClick={onCloseGroup}>
                                <IconLabel type="close" />
                            </Button>
                        </div>
                    )}
                </div>
            </header>
            <main>
                {children}
            </main>
        </div>
    );
};

export const WorkspacePlaceholder: ComponentType = ({ children }) => {
    return (
        <div class={cx("nahara-ui-workspace-placeholder")}>
            {children == null ? null : <div class={cx("overlay")}>{children}</div>}
        </div>
    );
};
