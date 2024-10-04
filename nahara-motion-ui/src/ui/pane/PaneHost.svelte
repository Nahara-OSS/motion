<!--
Pane host is a component that includes the panes and layout management.
-->

<script context="module" lang="ts">
    export interface IBaseLayout<T extends string> {
        type: T;
    }

    export interface TabState {
        type: string;
        state: any;
    }

    export interface TabLayout extends IBaseLayout<"tab"> {
        /**
         * An array of IDs that maps state ID whose type maps to component.
         */
        tabs: string[];
        selected: string;
    }

    export enum SplitDirection {
        LeftToRight = "left-to-right",
        RightToLeft = "right-to-left",
        TopToBottom = "top-to-bottom",
        BottomToTop = "bottom-to-top"
    }

    export interface SplitLayout extends IBaseLayout<"split"> {
        /**
         * The split direction of this split layout.
         */
        direction: SplitDirection;
        firstSize: number;
        first: PaneLayout;
        second: PaneLayout;
    }

    export type PaneLayout = TabLayout | SplitLayout;

    const splitters: Record<SplitDirection, {
        first(parent: DOMRect, size: number): DOMRect,
        second(parent: DOMRect, size: number): DOMRect
    }> = {
        "left-to-right": {
            first:  (parent, size) => new DOMRect(parent.x, parent.y, size, parent.height),
            second: (parent, size) => new DOMRect(parent.x + size, parent.y, parent.width - size, parent.height)
        },
        "right-to-left": {
            first:  (parent, size) => new DOMRect(parent.x + parent.width - size, parent.y, size, parent.height),
            second: (parent, size) => new DOMRect(parent.x, parent.y, parent.width - size, parent.height)
        },
        "top-to-bottom": {
            first:  (parent, size) => new DOMRect(parent.x, parent.y, parent.width, size),
            second: (parent, size) => new DOMRect(parent.x, parent.y + size, parent.width, parent.height - size)
        },
        "bottom-to-top": {
            first:  (parent, size) => new DOMRect(parent.x, parent.y + parent.height - size, parent.width, size),
            second: (parent, size) => new DOMRect(parent.x, parent.y, parent.width, parent.height - size)
        }
    };
</script>

<script lang="ts">
    import { createEventDispatcher, onMount, SvelteComponent } from "svelte";
    import TabbedPane from "./TabbedPane.svelte";

    export let layout: PaneLayout = {
        type: "tab",
        tabs: [],
        selected: ""
    };
    export let states: Record<string, TabState> = {};
    export let component: (name: string) => { new(...args: any[]): SvelteComponent };
    export let tabNames: (id: string) => string = id => id;
    export let dividerSize = 8;
    let halfDividerSize = dividerSize / 2;

    const dispatcher = createEventDispatcher();

    /**
     * UI data linked to TabLayout
     */
    interface PaneLayoutUIData {
        parent?: SplitLayout;
        box: DOMRect;
    }

    let tabLayouts: TabLayout[];
    let splitLayouts: SplitLayout[] = [];
    let data: Map<PaneLayout, PaneLayoutUIData> = new Map();
    let host: HTMLDivElement;
    let hostBox: DOMRect = new DOMRect(0, 0, 0, 0);
    let debugXY: { x: number, y: number } = { x: 0, y: 0 };
    let ghostPane: DOMRect | undefined = undefined;

    function flattenToTabLayouts(layout: PaneLayout, rect: DOMRect, parent?: SplitLayout): TabLayout[] {
        data.set(layout, {
            parent,
            box: rect
        });

        if (layout.type == "tab") {
            return [layout];
        }

        if (layout.type == "split") {
            splitLayouts.push(layout);
            const splitter = splitters[layout.direction];
            const firstRect = splitter.first(rect, layout.firstSize);
            const secondRect = splitter.second(rect, layout.firstSize);
            return [
                ...flattenToTabLayouts(layout.first, firstRect, layout),
                ...flattenToTabLayouts(layout.second, secondRect, layout)
            ];
        }

        return [];
    }

    function pointInBox(x: number, y: number, rect: DOMRect) {
        return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
    }

    function findTabLayoutFromPoint(x: number, y: number, checking: PaneLayout = layout, parent?: SplitLayout): {
        parent?: SplitLayout,
        tabLayout: TabLayout
    } | undefined {
        if (!pointInBox(x, y, data.get(checking)!.box)) return;
        if (checking.type == "tab") return { parent, tabLayout: checking };
        if (checking.type == "split") {
            // TODO store split layout size in boxes map
            // Allows faster searching
            return findTabLayoutFromPoint(x, y, checking.first, checking) ??
                findTabLayoutFromPoint(x, y, checking.second, checking);
        }
    }

    function calculateSplit(x: number, y: number, box: DOMRect): {
        direction: SplitDirection,
        size: number
    } | "center" {
        const centerBox = new DOMRect(box.x + box.width / 3, box.y + box.height / 3, box.width / 3, box.height / 3);
        const tabsBox = new DOMRect(box.x, box.y, box.width, 34 + halfDividerSize);
        if (pointInBox(x, y, centerBox) || pointInBox(x, y, tabsBox)) return "center";

        const left = { direction: SplitDirection.LeftToRight, size: x - box.x };
        const right = { direction: SplitDirection.RightToLeft, size: box.width - (x - box.x) };
        const top = { direction: SplitDirection.TopToBottom, size: y - box.y };
        const bottom = { direction: SplitDirection.BottomToTop, size: box.height - (y - box.y) };
        return [left, right, top, bottom].filter(v => v.size >= 0).reduce((a, b) => a.size < b.size ? a : b);
    }

    function paneDragging(x: number, y: number, tabLayout?: TabLayout) {
        x -= hostBox.x;
        y -= hostBox.y;
        ghostPane = undefined;
        const dropIn = findTabLayoutFromPoint(x, y);
        if (!dropIn) return;

        if (dropIn.tabLayout == tabLayout || dropIn.tabLayout.tabs.length == 0) {
            const box = data.get(dropIn.tabLayout)!.box;
            ghostPane = new DOMRect(box.x, box.y, box.width, box.height);
            return;
        }

        const dropInBox = data.get(dropIn.tabLayout)!.box;
        const split = calculateSplit(x, y, dropInBox);
        
        if (split == "center") {
            const box = data.get(dropIn.tabLayout)!.box;
            ghostPane = new DOMRect(box.x, box.y, box.width, box.height);
            return;
        }

        ghostPane = splitters[split.direction].first(dropInBox, split.size);
    }

    /**
     * Drop entire pane to given coordinates.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @param tabLayout The tab layout to drop. It will either transfer to empty or split TabLayout under the cursor.
     */
    function paneDrop(x: number, y: number, tabLayout: TabLayout) {
        x -= hostBox.x;
        y -= hostBox.y;
        ghostPane = undefined;

        const dropIn = findTabLayoutFromPoint(x, y);
        if (!dropIn) {
            console.warn("PaneHost: Drop outside the host");
            return;
        }

        if (dropIn.tabLayout == tabLayout) {
            // Drop to self -> Cancel
            return;
        } else if (dropIn.tabLayout.tabs.length == 0) {
            // Drop in empty -> Transfer
            dropIn.tabLayout.tabs = tabLayout.tabs;
            dropIn.tabLayout.selected = tabLayout.selected;
            tabLayout.tabs = [];
            tabLayout.selected = "";
        } else {
            // Drop in pane with existing tabs -> Split
            const parent = dropIn.parent ?? layout;
            const dropInBox = data.get(dropIn.tabLayout)!.box;
            const split = calculateSplit(x, y, dropInBox);

            if (split == "center") {
                // Transfer tabs
                tabLayout.tabs.forEach(t => {
                    if (!dropIn.tabLayout.tabs.includes(t)) dropIn.tabLayout.tabs.push(t);
                });
                dropIn.tabLayout.selected = tabLayout.selected;
                tabLayout.tabs = [];
                tabLayout.selected = "";
                layout = layout;
                dispatcher("layoutupdate", layout);
                return;
            }

            // Split current tab layout
            const newLayout: SplitLayout = {
                type: "split",
                direction: split.direction,
                firstSize: split.size,
                first: tabLayout,
                second: dropIn.tabLayout
            };

            if (parent.type == "split") {
                const sourceParent = data.get(tabLayout)?.parent;
                if (parent.first == dropIn.tabLayout) parent.first = newLayout;
                if (parent.second == dropIn.tabLayout) parent.second = newLayout;
                if (sourceParent?.first == tabLayout) sourceParent!.first = { type: "tab", tabs: [], selected: "" };
                if (sourceParent?.second == tabLayout) sourceParent!.second = { type: "tab", tabs: [], selected: "" };
            }

            if (parent.type == "tab") {
                layout = newLayout;
                dispatcher("layoutupdate", newLayout);
                return;
            }
        }

        layout = layout;
        dispatcher("layoutupdate", layout);
    }

    function paneNuke(tabLayout: TabLayout) {
        const parent = data.get(tabLayout)!.parent;
        if (!parent) return; // Can't remove the only pane
        
        const otherPane = parent.first == tabLayout ? parent.second : parent.first;
        const parentOfParent = data.get(parent)!.parent;
        if (!parentOfParent) {
            layout = otherPane;
            dispatcher("layoutupdate", otherPane);
            return;
        }

        if (parentOfParent.first == parent) parentOfParent.first = otherPane;
        if (parentOfParent.second == parent) parentOfParent.second = otherPane;
        layout = layout;
        dispatcher("layoutupdate", layout);
    }

    function dividerPosition(splitLayout: SplitLayout) {
        const box = data.get(splitLayout)!.box;
        const isVertical = [SplitDirection.LeftToRight, SplitDirection.RightToLeft].includes(splitLayout.direction);
        const flip = [SplitDirection.RightToLeft, SplitDirection.BottomToTop].includes(splitLayout.direction);
        const rect = splitters[splitLayout.direction][flip ? "second" : "first"](box, splitLayout.firstSize);
        return {
            left: isVertical ? rect.right - halfDividerSize : rect.left,
            top: !isVertical ? rect.bottom - halfDividerSize : rect.top,
            width: isVertical ? dividerSize : box.width,
            height: !isVertical ? dividerSize : box.height
        };
    }

    let resizingLayout: SplitLayout | undefined = undefined;
    let eventOriginX = 0, eventOriginY = 0;
    let eventDx = 0, eventDy = 0;
    let isVerticalDivider = false;

    function handleDividerDragStart(e: MouseEvent, splitLayout: SplitLayout) {
        resizingLayout = splitLayout;
        eventOriginX = e.clientX;
        eventOriginY = e.clientY;
        eventDx = 0;
        eventDy = 0;
        isVerticalDivider = [SplitDirection.LeftToRight, SplitDirection.RightToLeft].includes(splitLayout.direction);

        let box = data.get(splitLayout.first)!.box;
        ghostPane = new DOMRect(box.x, box.y, box.width, box.height)
    }

    function handleDividerDrag(e: MouseEvent) {
        if (!resizingLayout) return;
        eventDx = e.clientX - eventOriginX;
        eventDy = e.clientY - eventOriginY;

        let box = data.get(resizingLayout.first)!.box;
        if (resizingLayout.direction == SplitDirection.LeftToRight) ghostPane!.width = box.width + eventDx;
        if (resizingLayout.direction == SplitDirection.TopToBottom) ghostPane!.height = box.height + eventDy;

        if (resizingLayout.direction == SplitDirection.RightToLeft) {
            ghostPane!.x = box.x + eventDx;
            ghostPane!.width = box.width - eventDx;
        }

        if (resizingLayout.direction == SplitDirection.BottomToTop) {
            ghostPane!.y = box.y + eventDy;
            ghostPane!.height = box.height - eventDy;
        }
    }

    function handleDividerDragDone(e: MouseEvent) {
        if (resizingLayout) {
            resizingLayout.firstSize = ({
                "left-to-right": resizingLayout.firstSize + eventDx,
                "right-to-left": resizingLayout.firstSize - eventDx,
                "top-to-bottom": resizingLayout.firstSize + eventDy,
                "bottom-to-top": resizingLayout.firstSize - eventDy
            } as Record<SplitDirection, number>)[resizingLayout.direction] ?? resizingLayout.firstSize;
            layout = layout;
            dispatcher("layoutupdate", layout);
        }

        resizingLayout = undefined;
        ghostPane = undefined;
    }

    $: {
        data.clear();
        splitLayouts = [];
        hostBox = host?.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0);
        tabLayouts = flattenToTabLayouts(layout, new DOMRect(0, 0, hostBox.width, hostBox.height));
    }

    onMount(() => {
        let resizeObserver = new ResizeObserver(() => layout = layout);
        resizeObserver.observe(host);
        return () => resizeObserver.disconnect();
    });
</script>

<svelte:body
    on:mousemove={handleDividerDrag}
    on:mouseup={handleDividerDragDone}
/>

<div class="pane-host" bind:this={host}>
    <div class="debug-pointer" style:left="{debugXY.x}px" style:top="{debugXY.y}px"></div>
    {#each tabLayouts as tabLayout}
        <TabbedPane
            tabs={tabLayout.tabs}
            selecting={tabLayout.selected}
            position={data.get(tabLayout)?.box}
            {dividerSize}
            {tabNames}
            on:opentab={id => { tabLayout.selected = id.detail; dispatcher("layoutupdate", layout); }}
            on:handledrag={e => paneDragging(e.detail.x, e.detail.y, tabLayout)}
            on:handledrop={e => paneDrop(e.detail.x, e.detail.y, tabLayout)}
            on:tabdragstart={e => {
                layout = layout;
                dispatcher("layoutupdate", layout);
                paneDragging(e.detail.x, e.detail.y);
            }}
            on:tabdrag={e => paneDragging(e.detail.x, e.detail.y)}
            on:tabdrop={e => paneDrop(e.detail.x, e.detail.y, {
                type: "tab",
                tabs: [e.detail.id],
                selected: e.detail.id
            })}
            on:paneclose={e => paneNuke(tabLayout)}
        >
            {#if tabLayout.selected}
                <svelte:component this={component(states[tabLayout.selected].type)} state={states[tabLayout.selected].state} />
            {/if}
        </TabbedPane>
    {/each}
    {#each splitLayouts as splitLayout}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="divider {splitLayout.direction}"
            style:left="{dividerPosition(splitLayout).left + (resizingLayout == splitLayout && isVerticalDivider ? eventDx : 0)}px"
            style:top="{dividerPosition(splitLayout).top + (resizingLayout == splitLayout && !isVerticalDivider ? eventDy : 0)}px"
            style:width="{dividerPosition(splitLayout).width}px"
            style:height="{dividerPosition(splitLayout).height}px"
            on:mousedown={e => handleDividerDragStart(e, splitLayout)}
        ></div>
    {/each}
    {#if ghostPane}
        <div
            class="ghost-pane"
            style:left="{ghostPane.left}px"
            style:top="{ghostPane.top}px"
            style:width="{ghostPane.width}px"
            style:height="{ghostPane.height}px"
        ></div>
    {/if}
</div>

<style lang="scss">
    .pane-host {
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: relative;

        .debug-pointer {
            display: none;
            position: absolute;
            width: 8px;
            height: 8px;
            background-color: red;
            z-index: 2;
        }

        .divider {
            position: absolute;
            &:hover { background-color: #d1d1d1; }
            &:hover, &:active { z-index: 1; }
            &.left-to-right, &.right-to-left { cursor: ew-resize; }
            &.top-to-bottom, &.bottom-to-top { cursor: ns-resize; }
        }

        .ghost-pane {
            position: absolute;
            background-color: #0000001f;
        }
    }
</style>