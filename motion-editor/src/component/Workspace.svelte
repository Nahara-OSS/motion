<script lang="ts" module>
    function splitWindowUpdater<T>(
        windowId: string,
        dir: TilingSplitNode["dir"],
        primarySize: number,
        primary: TilingNode<T>,
    ): (state: WorkspaceState<T>) => WorkspaceState<T> | null {
        return (state) => {
            if (!state.tilingNodes[windowId]) {
                return null;
            }

            const newParentId = crypto.randomUUID();
            const primaryId = crypto.randomUUID();
            const parentEntry = Object.entries(state.tilingNodes).find(
                ([_, node]) => node.type == "split" && (node.primaryId == windowId || node.secondaryId == windowId),
            );

            // The target window is the root
            if (parentEntry == null) {
                state = {
                    ...state,
                    tilingRoot: newParentId,
                    tilingNodes: {
                        [newParentId]: {
                            type: "split",
                            dir,
                            primarySize,
                            primaryId,
                            secondaryId: windowId,
                        },
                        [primaryId]: primary,
                        [windowId]: state.tilingNodes[windowId],
                    },
                };
            } else {
                const [parentId, parentNode] = parentEntry as [string, TilingSplitNode];

                state = {
                    ...state,
                    tilingNodes: {
                        ...state.tilingNodes,
                        [parentId]: {
                            ...parentNode,
                            [parentNode.primaryId == windowId ? "primaryId" : "secondaryId"]: newParentId,
                        },
                        [newParentId]: {
                            type: "split",
                            dir,
                            primarySize,
                            primaryId,
                            secondaryId: windowId,
                        },
                        [primaryId]: primary,
                        [windowId]: state.tilingNodes[windowId],
                    },
                };
            }

            return state;
        };
    }

    function updateFloatingWindowUpdater<T>(
        windowId: string,
        updater: (window: FloatingWindow<T>) => FloatingWindow<T>,
    ): (state: WorkspaceState<T>) => WorkspaceState<T> {
        return (state) => ({
            ...state,
            floating: state.floating.map((window) => (window.id == windowId ? updater(window) : window)),
        });
    }

    function updateTilingWindowUpdater<T>(
        windowId: string,
        updater: (window: TilingLeafNode<T>) => TilingLeafNode<T>,
    ): (state: WorkspaceState<T>) => WorkspaceState<T> {
        return (state) => ({
            ...state,
            tilingNodes: {
                ...state.tilingNodes,
                [windowId]:
                    state.tilingNodes[windowId].type == "leaf"
                        ? updater(state.tilingNodes[windowId])
                        : state.tilingNodes[windowId],
            },
        });
    }

    function updateTilingNodeUpdater<T>(
        nodeId: string,
        updater: (node: TilingNode<T>) => TilingNode<T>,
    ): (state: WorkspaceState<T>) => WorkspaceState<T> {
        return (state) => ({
            ...state,
            tilingNodes: { ...state.tilingNodes, [nodeId]: updater(state.tilingNodes[nodeId]) },
        });
    }

    function closeFloatingWindowUpdater<T>(windowId: string): (state: WorkspaceState<T>) => WorkspaceState<T> {
        return (state) => ({ ...state, floating: state.floating.filter((w) => w.id != windowId) });
    }

    function closeTilingNodeUpdater<T>(nodeId: string): (state: WorkspaceState<T>) => WorkspaceState<T> {
        return (state) => {
            function close(nodeId: string) {
                const node = state.tilingNodes[nodeId];

                if (node.type == "split") {
                    close(node.primaryId);
                    close(node.secondaryId);
                }

                const newNodes = Object.entries(state.tilingNodes).filter(([id]) => id != nodeId);
                state = { ...state, tilingNodes: Object.fromEntries(newNodes) };
            }

            close(nodeId);
            return tidyWorkspace(state);
        };
    }

    function selectTabUpdater<T extends WindowContent<unknown>>(tabId: string): (window: T) => T {
        return (window) => ({ ...window, selectedId: tabId });
    }

    function updateTabUpdater<T, W extends WindowContent<T>>(
        tabId: string,
        updater: T | ((value: T) => T),
    ): (window: W) => W {
        return (window) => {
            return {
                ...window,
                tabs: window.tabs.map((tab) => {
                    if (tab.tabId != tabId) return tab;
                    const content = typeof updater == "function" ? (updater as (value: T) => T)(tab.content) : updater;
                    return { ...tab, content };
                }),
            };
        };
    }

    function closeTabUpdater<T extends WindowContent<unknown>>(tabId: string): (window: T) => T {
        return (window) => {
            const tabs = window.tabs.filter((tab) => tab.tabId != tabId);
            const selectIndex = window.tabs.findIndex((tab) => tab.tabId == window.selectedId);
            const selectedId = tabs[selectIndex]?.tabId ?? tabs[selectIndex - 1]?.tabId ?? tabs[0].tabId;
            return { ...window, selectedId, tabs: tabs };
        };
    }

    function bringToFrontUpdater<T>(windowId: string): (state: WorkspaceState<T>) => WorkspaceState<T> {
        return (state) => ({
            ...state,
            floating: [
                ...state.floating.filter((w) => w.id != windowId),
                state.floating.find((w) => w.id == windowId)!,
            ],
        });
    }

    function tidyWorkspace<T>(state: WorkspaceState<T>): WorkspaceState<T> {
        if (state.floating.some((w) => w.tabs.length == 0)) {
        }

        const tilingNodes: Record<string, TilingNode<T>> = {};
        const tilingRoot = tidyNode(state.tilingRoot);

        /**
         * @param nodeId ID of the target node, or null if the parent should be collapsed
         */
        function tidyNode(nodeId: string): string | null {
            const node = state.tilingNodes[nodeId];
            if (node == null) return null;

            switch (node.type) {
                case "split": {
                    const primaryId = tidyNode(node.primaryId);
                    const secondaryId = tidyNode(node.secondaryId);

                    if (primaryId != null && secondaryId == null) return primaryId;
                    if (primaryId == null && secondaryId != null) return secondaryId;

                    if (primaryId != null && secondaryId != null) {
                        tilingNodes[nodeId] = { ...node, primaryId, secondaryId };
                        return nodeId;
                    }

                    return null;
                }

                case "leaf": {
                    if (node.tabs.length > 0) {
                        tilingNodes[nodeId] = node;
                        return nodeId;
                    }

                    return null;
                }
            }
        }

        return {
            ...state,
            floating: state.floating.filter((w) => w.tabs.length != 0),
            tilingNodes,
            tilingRoot: tilingRoot!,
        };
    }
</script>

<script lang="ts" generics="T">
    import type { Snippet } from "svelte";
    import WindowLayout from "./WindowLayout.svelte";
    import { trackPointer } from "../util/trackPointer";
    import Button from "./Button.svelte";
    import IconLabel from "./IconLabel.svelte";
    import type {
        FloatingWindow,
        TilingLeafNode,
        TilingNode,
        TilingSplitNode,
        WindowContent,
        WorkspaceState,
    } from "../workspace";

    const {
        workspace,
        onWorkspaceChange,
        panelLabel,
        panel,
    }: {
        /**
         * Workspace layout state.
         */
        workspace: WorkspaceState<T>;

        /**
         * Workspace state change callback.
         *
         * @param updater State updating function
         */
        onWorkspaceChange: (updater: (state: WorkspaceState<T>) => WorkspaceState<T>) => unknown;

        /**
         * Panel label snippet.
         *
         * This snippet renders the components that belongs to label family, such as `<TextLabel>` or `<KeybindLabel>`
         * based on provided panel state.
         */
        panelLabel: Snippet<[panel: T]>;

        /**
         * Panel content snippet.
         *
         * This snippet renders the `<Panel>` components based on provided panel state. The second parameter may also be
         * used to modify the panel state (either set to new value or map from previous to next state).
         */
        panel: Snippet<[panel: T, setPanel: (value: T | ((panel: T) => T)) => void]>;
    } = $props();

    let root = $state<HTMLDivElement | null>(null);
    let bounds = $state<DOMRect | null>(null);
    const titlebarHeight = 36;
    const divideSensingRange = 100;

    const [tilingWindows, dividers] = $derived(
        bounds != null ? buildTilingWindows(workspace, bounds.width, bounds.height) : [[], []],
    );

    let draggingTab = $state<{
        kind: "tiling" | "floating";
        windowId: string;
        tabId: string;
        x: number;
        y: number;
    } | null>(null);

    let draggingTabContent = $derived(
        draggingTab != null
            ? ((draggingTab.kind == "floating"
                  ? workspace.floating.find((window) => window.id == draggingTab!.windowId)
                  : (workspace.tilingNodes[draggingTab.windowId] as TilingLeafNode<T>)
              )?.tabs.find((tab) => tab.tabId == draggingTab!.tabId)?.content ?? null)
            : null,
    );

    const dropTargetBox = $derived(draggingTab != null ? findDropTargetBox(draggingTab.x, draggingTab.y) : null);

    type Divider = {
        nodeId: string;
        dir: TilingSplitNode["dir"];
        x: number;
        y: number;
        width: number;
        height: number;
    };

    function buildTilingWindows(
        workspace: WorkspaceState<T>,
        width: number,
        height: number,
    ): readonly [windows: FloatingWindow<T>[], dividers: Divider[]] {
        const windows: FloatingWindow<T>[] = [];
        const dividers: Divider[] = [];
        const padding = 12;
        const gap = 6;

        function visit(nodeId: string, x: number, y: number, width: number, height: number) {
            const node = workspace.tilingNodes[nodeId];

            switch (node.type) {
                case "split": {
                    // p - primary; s - secondary; d - divider
                    const pW = node.dir == "row" || node.dir == "row-reverse" ? node.primarySize : width;
                    const pH = node.dir == "column" || node.dir == "column-reverse" ? node.primarySize : height;
                    const sW = pW == width ? width : width - pW - gap;
                    const sH = pH == height ? height : height - pH - gap;
                    const pX = node.dir == "row-reverse" ? x + sW + gap : x;
                    const pY = node.dir == "column-reverse" ? y + sH + gap : y;
                    const sX = node.dir == "row" ? x + pW + gap : x;
                    const sY = node.dir == "column" ? y + pH + gap : y;
                    const dW = pW == sW ? width : gap;
                    const dH = pH == sH ? height : gap;
                    const dX = pW == sW ? x : (node.dir == "row" ? sX : pX) - gap;
                    const dY = pH == sH ? y : (node.dir == "column" ? sY : pY) - gap;
                    visit(node.primaryId, pX, pY, pW, pH);
                    visit(node.secondaryId, sX, sY, sW, sH);
                    dividers.push({ nodeId, dir: node.dir, x: dX, y: dY, width: dW, height: dH });
                    break;
                }

                case "leaf": {
                    windows.push({ id: nodeId, x, y, width, height, selectedId: node.selectedId, tabs: node.tabs });
                    break;
                }
            }
        }

        visit(workspace.tilingRoot, padding, padding, width - padding * 2, height - padding * 2);
        return [windows, dividers];
    }

    function findDropTargetBox(x: number, y: number): DOMRect | null {
        for (let i = workspace.floating.length - 1; i >= 0; i--) {
            const window = workspace.floating[i];
            const { width, height } = window;

            if (x >= window.x && x <= window.x + width && y >= window.y && y <= window.y + height) {
                if (y <= window.y + titlebarHeight) return null;
                return null;
            }
        }

        for (const window of tilingWindows) {
            const { width, height } = window;

            if (x >= window.x && x <= window.x + width && y >= window.y && y <= window.y + height) {
                if (y <= window.y + titlebarHeight) return null;

                if (x <= window.x + divideSensingRange) {
                    return new DOMRect(window.x, window.y, window.width / 2, window.height);
                }

                if (x >= window.x + window.width - divideSensingRange) {
                    return new DOMRect(window.x + window.width / 2, window.y, window.width / 2, window.height);
                }

                if (y <= window.y + divideSensingRange) {
                    return new DOMRect(window.x, window.y, window.width, window.height / 2);
                }

                if (y >= window.y + window.height - divideSensingRange) {
                    return new DOMRect(window.x, window.y + window.height / 2, window.width, window.height / 2);
                }

                return null;
            }
        }

        return null;
    }

    function onTilingWindowDrag(e: PointerEvent, windowId: string) {
        let { clientX: lastPointerX, clientY: lastPointerY } = e;
        const window = tilingWindows.find((e) => e.id == windowId);
        if (window == null) return;

        onWorkspaceChange((state) => {
            state = closeTilingNodeUpdater<T>(windowId)(state);
            state = { ...state, floating: [...state.floating, window] };
            return state;
        });

        trackPointer(e, (e) => {
            const dx = e.clientX - lastPointerX;
            const dy = e.clientY - lastPointerY;

            onWorkspaceChange(
                updateFloatingWindowUpdater(windowId, (window) => ({
                    ...window,
                    x: window.x + dx,
                    y: window.y + dy,
                })),
            );

            lastPointerX = e.clientX;
            lastPointerY = e.clientY;
        });
    }

    function onFloatingWindowDrag(e: PointerEvent, windowId: string) {
        let { clientX: lastPointerX, clientY: lastPointerY } = e;

        trackPointer(e, (e) => {
            const dx = e.clientX - lastPointerX;
            const dy = e.clientY - lastPointerY;

            onWorkspaceChange(
                updateFloatingWindowUpdater(windowId, (window) => ({
                    ...window,
                    x: window.x + dx,
                    y: window.y + dy,
                })),
            );

            lastPointerX = e.clientX;
            lastPointerY = e.clientY;
        });
    }

    function onFloatingWindowResizerDrag(e: PointerEvent, windowId: string) {
        let { clientX: lastPointerX, clientY: lastPointerY } = e;
        e.preventDefault();

        trackPointer(e, (e) => {
            const dx = e.clientX - lastPointerX;
            const dy = e.clientY - lastPointerY;

            onWorkspaceChange(
                updateFloatingWindowUpdater(windowId, (window) => ({
                    ...window,
                    width: Math.max(window.width + dx, 300),
                    height: Math.max(window.height + dy, 72),
                })),
            );

            lastPointerX = e.clientX;
            lastPointerY = e.clientY;
        });
    }

    function onDividerDrag(e: PointerEvent, nodeId: string) {
        let { clientX: lastPointerX, clientY: lastPointerY } = e;
        e.preventDefault();

        trackPointer(e, (e) => {
            const dx = e.clientX - lastPointerX;
            const dy = e.clientY - lastPointerY;

            onWorkspaceChange(
                updateTilingNodeUpdater(nodeId, (node) => {
                    if (node.type != "split") return node;
                    const ds =
                        node.dir == "row" ? dx : node.dir == "row-reverse" ? -dx : node.dir == "column" ? dy : -dy;
                    return { ...node, primarySize: node.primarySize + ds };
                }),
            );

            lastPointerX = e.clientX;
            lastPointerY = e.clientY;
        });
    }

    function onWindowTabDrag(e: PointerEvent, kind: "floating" | "tiling", windowId: string, tabId: string) {
        const { left, top } = root?.getBoundingClientRect() ?? { left: 0, top: 0 };
        draggingTab = { kind, windowId, tabId, x: e.clientX - left, y: e.clientY - top };

        trackPointer(
            e,
            (e) => {
                const { left, top } = root?.getBoundingClientRect() ?? { left: 0, top: 0 };

                if (draggingTab != null) {
                    draggingTab.x = e.clientX - left;
                    draggingTab.y = e.clientY - top;
                }
            },
            (e) =>
                queueMicrotask(() => {
                    if (draggingTab != null) {
                        const { x, y } = draggingTab;

                        onWorkspaceChange((state) => {
                            const window =
                                kind == "floating"
                                    ? workspace.floating.find((w) => w.id == windowId)
                                    : tilingWindows.find((w) => w.id == windowId);
                            const closeWindow = window == null || window.tabs.length <= 1;
                            const tab = window?.tabs.find((t) => t.tabId == tabId);
                            const { left, top } = root?.getBoundingClientRect() ?? { left: 0, top: 0 };

                            if (tab == null) {
                                return state;
                            }

                            if (kind == "floating") {
                                if (closeWindow) state = closeFloatingWindowUpdater<T>(windowId)(state);
                                else state = updateFloatingWindowUpdater<T>(windowId, closeTabUpdater(tabId))(state);
                            } else {
                                if (closeWindow) state = closeTilingNodeUpdater<T>(windowId)(state);
                                else state = updateTilingWindowUpdater<T>(windowId, closeTabUpdater(tabId))(state);
                            }

                            for (const window of tilingWindows) {
                                const { width, height } = window;

                                if (x >= window.x && x <= window.x + width && y >= window.y && y <= window.y + height) {
                                    let splitDirection: TilingSplitNode["dir"];
                                    let splitSize: number;

                                    if (x <= window.x + divideSensingRange) {
                                        splitDirection = "row";
                                        splitSize = window.width / 2;
                                    } else if (x >= window.x + window.width - divideSensingRange) {
                                        splitDirection = "row-reverse";
                                        splitSize = window.width / 2;
                                    } else if (y <= window.y + divideSensingRange) {
                                        splitDirection = "column";
                                        splitSize = window.height / 2;
                                    } else if (y >= window.y + window.height - divideSensingRange) {
                                        splitDirection = "column-reverse";
                                        splitSize = window.height / 2;
                                    } else {
                                        break;
                                    }

                                    const updatedState = splitWindowUpdater(window.id, splitDirection, splitSize, {
                                        type: "leaf",
                                        selectedId: tabId,
                                        tabs: [tab],
                                    })(state);

                                    if (updatedState != null) {
                                        return updatedState;
                                    }
                                }
                            }

                            return tidyWorkspace({
                                ...state,
                                floating: [
                                    ...state.floating,
                                    {
                                        id: crypto.randomUUID(),
                                        x: e.clientX - left,
                                        y: e.clientY - top,
                                        width: window?.width ?? 400,
                                        height: window?.height ?? 300,
                                        selectedId: tabId,
                                        tabs: [tab],
                                    },
                                ],
                            });
                        });
                    }

                    draggingTab = null;
                }),
        );
    }

    function onTabDrop(kind: "floating" | "tiling", windowId: string, insertAt: number) {
        if (draggingTab == null) return;
        const { kind: sourceKind, windowId: sourceWindowId, tabId } = draggingTab;

        onWorkspaceChange((state) => {
            const sourceWindow =
                sourceKind == "floating"
                    ? workspace.floating.find((w) => w.id == sourceWindowId)
                    : tilingWindows.find((w) => w.id == sourceWindowId);
            const closeWindow = sourceWindow == null || sourceWindow.tabs.length <= 1;
            const tab = sourceWindow?.tabs.find((t) => t.tabId == tabId);

            if (sourceWindow == null || tab == null) {
                return state;
            } else if (sourceKind == "floating") {
                if (closeWindow) state = closeFloatingWindowUpdater<T>(sourceWindowId)(state);
                else state = updateFloatingWindowUpdater<T>(sourceWindowId, closeTabUpdater(tabId))(state);
            } else {
                if (closeWindow) state = closeTilingNodeUpdater<T>(sourceWindowId)(state);
                else state = updateTilingWindowUpdater<T>(sourceWindowId, closeTabUpdater(tabId))(state);
            }

            const windowUpdater = <W extends WindowContent<T>>(window: W) => ({
                ...window,
                selectedId: tabId,
                tabs: [...window.tabs.slice(0, insertAt), tab, ...window.tabs.slice(insertAt)],
            });

            if (kind == "floating") state = updateFloatingWindowUpdater<T>(windowId, windowUpdater)(state);
            else state = updateTilingWindowUpdater<T>(windowId, windowUpdater)(state);
            return tidyWorkspace(state);
        });

        draggingTab = null;
    }
</script>

<div class="workspace" bind:this={root} bind:contentRect={bounds}>
    {#each tilingWindows as tiling (tiling.id)}
        <div
            class="window tiling"
            style:left={`${tiling.x}px`}
            style:top={`${tiling.y}px`}
            style:width={`${tiling.width}px`}
            style:height={`${tiling.height}px`}
        >
            <WindowLayout
                tabs={tiling.tabs}
                dragging={draggingTab != null}
                tabSelected={(tab) => tab.tabId == tiling.selectedId}
                tabKey={(tab) => tab.tabId}
                onWindowDrag={tilingWindows.length > 1 ? (e) => onTilingWindowDrag(e, tiling.id) : undefined}
                onTabSelect={(tab) => {
                    onWorkspaceChange(updateTilingWindowUpdater(tiling.id, selectTabUpdater(tab.tabId)));
                }}
                onTabDrag={(e, tab) => onWindowTabDrag(e, "tiling", tiling.id, tab.tabId)}
                onTabDrop={(insertAt) => onTabDrop("tiling", tiling.id, insertAt)}
                onTabClose={(tab) => {
                    onWorkspaceChange(updateTilingWindowUpdater(tiling.id, closeTabUpdater(tab.tabId)));
                }}
                onWindowClose={tilingWindows.length > 1
                    ? () => onWorkspaceChange(closeTilingNodeUpdater(tiling.id))
                    : undefined}
            >
                {#snippet tabLabel(tab)}
                    {@render panelLabel(tab.content)}
                {/snippet}
                {@render panel(tiling.tabs.find((t) => t.tabId == tiling.selectedId)!.content, (value) => {
                    onWorkspaceChange(updateTilingWindowUpdater(tiling.id, updateTabUpdater(tiling.selectedId, value)));
                })}
            </WindowLayout>
        </div>
    {/each}
    {#each dividers as divider (divider.nodeId)}
        <div
            class={["divider", divider.dir]}
            role="separator"
            style:left={`${divider.x}px`}
            style:top={`${divider.y}px`}
            style:width={`${divider.width}px`}
            style:height={`${divider.height}px`}
            onpointerdown={(e) => onDividerDrag(e, divider.nodeId)}
        ></div>
    {/each}
    {#each workspace.floating as floating (floating.id)}
        <div
            class="window floating"
            role="none"
            style:left={`${floating.x}px`}
            style:top={`${floating.y}px`}
            style:width={`${floating.width}px`}
            style:height={`${floating.height}px`}
            onpointerdowncapture={() => onWorkspaceChange(bringToFrontUpdater(floating.id))}
        >
            <WindowLayout
                tabs={floating.tabs}
                dragging={draggingTab != null}
                tabSelected={(tab) => tab.tabId == floating.selectedId}
                tabKey={(tab) => tab.tabId}
                onWindowDrag={(e) => onFloatingWindowDrag(e, floating.id)}
                onResizerDrag={(e) => onFloatingWindowResizerDrag(e, floating.id)}
                onTabSelect={(tab) => {
                    onWorkspaceChange(updateFloatingWindowUpdater(floating.id, selectTabUpdater(tab.tabId)));
                }}
                onTabDrag={(e, tab) => onWindowTabDrag(e, "floating", floating.id, tab.tabId)}
                onTabDrop={(insertAt) => onTabDrop("floating", floating.id, insertAt)}
                onTabClose={(tab) => {
                    onWorkspaceChange(updateFloatingWindowUpdater(floating.id, closeTabUpdater(tab.tabId)));
                }}
                onWindowClose={() => {
                    onWorkspaceChange(closeFloatingWindowUpdater(floating.id));
                }}
            >
                {#snippet tabLabel(tab)}
                    {@render panelLabel(tab.content)}
                {/snippet}
                {@render panel(floating.tabs.find((t) => t.tabId == floating.selectedId)!.content, (value) => {
                    onWorkspaceChange(
                        updateFloatingWindowUpdater(floating.id, updateTabUpdater(floating.selectedId, value)),
                    );
                })}
            </WindowLayout>
        </div>
    {/each}
    {#if dropTargetBox != null}
        <div
            class="drop-target-box"
            style:left={`${dropTargetBox.left}px`}
            style:top={`${dropTargetBox.top}px`}
            style:width={`${dropTargetBox.width}px`}
            style:height={`${dropTargetBox.height}px`}
        ></div>
    {/if}
    {#if bounds != null && draggingTab != null && draggingTabContent != null}
        <div class="dragging-tab" style:left={`${draggingTab.x}px`} style:top={`${draggingTab.y}px`}>
            <div class="label">
                {@render panelLabel(draggingTabContent)}
            </div>
            <Button style="toolbar">
                <IconLabel type="close" />
            </Button>
        </div>
    {/if}
</div>

<style>
    .workspace {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;

        > .window {
            position: absolute;
            border: 1px solid transparent;
            border-color: #dfdfdf;
        }

        > .divider {
            position: absolute;
            background-color: transparent;
            border: 1px solid transparent;
            transition: background-color 0.1s linear;

            &:hover {
                transition: background-color 0.1s linear;
                transition-delay: 0.2s;
                background-color: #9f9f9f;
            }

            &:active {
                transition: none;
                background-color: #7f7f7f;
            }

            &.row,
            &.row-reverse {
                cursor: ew-resize;
            }

            &.column,
            &.column-reverse {
                cursor: ns-resize;
            }
        }

        > .floating {
            border-color: #9f9f9f;
            box-shadow: 0 0 12px #0000000f;

            &:last-child {
                border-color: #3f3f3f;
            }
        }

        > .dragging-tab {
            position: absolute;
            display: flex;
            flex-direction: row;
            background-color: #ffffff;
            padding: 0.5rem;
            border: 1px solid #9f9f9f;
            align-items: center;
            height: 3rem;
            box-sizing: border-box;
            pointer-events: none;
            gap: 0.2rem;
            align-items: center;

            > .label {
                display: flex;
                flex-direction: row;
                height: 2rem;
                padding-inline: 0.2rem;
                align-items: center;
            }
        }

        > .drop-target-box {
            position: absolute;
            pointer-events: none;
            background-color: #0000000f;
        }
    }
</style>
