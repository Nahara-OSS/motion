<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let tabs: string[] = [];
    export let selecting: string = "";
    export let position: DOMRect = new DOMRect(0, 0, 0, 0);
    export let tabNames: (id: string) => string = id => id;
    export let dividerSize = 4;
    let halfDividerSize = dividerSize / 2;
    
    const dispatcher = createEventDispatcher();
    let lastClickTime = 0;

    let pane: HTMLDivElement;
    let paneBox: DOMRect | undefined = undefined;
    $: paneBox = pane?.getBoundingClientRect();

    let dragEx = 0, dragEy = 0;
    let dragDx = 0, dragDy = 0;
    let draggingHandle = false;
    let draggingTab = "", clickedTab = "";
    let clickedTabBox: DOMRect | undefined = undefined;

    function handleTabMouseDown(e: MouseEvent, id: string) {
        if (tabs.length == 1) {
            handleDragHandleMouseDown(e);
            return;
        }

        dispatcher("opentab", clickedTab = id);
        [dragDx, dragDy] = [0, 0];
        [dragEx, dragEy] = [e.clientX, e.clientY];
        clickedTabBox = (e.target as HTMLDivElement).getBoundingClientRect();
    }

    function handleTabMouseMove(e: MouseEvent) {
        if (clickedTab == "") return;
        if (dragEx == e.clientX && dragEy == e.clientY) return;

        if (draggingTab == "") {
            draggingTab = clickedTab;
            let idx = tabs.indexOf(clickedTab);
            if (idx != -1) tabs.splice(idx, 1);
            if (selecting == clickedTab) selecting = tabs[0] ?? "";
            dispatcher("opentab", selecting);
            dispatcher("tabdragstart", { x: e.clientX, y: e.clientY, id: draggingTab });
            return;
        }

        if (draggingTab == clickedTab) {
            dragDx = e.clientX - dragEx;
            dragDy = e.clientY - dragEy;
            dispatcher("tabdrag", { x: e.clientX, y: e.clientY, id: draggingTab });
        }
    }

    function handleTabMouseUp(e: MouseEvent) {
        if (clickedTab != "" && clickedTab == draggingTab)
            dispatcher("tabdrop", { x: e.clientX, y: e.clientY, id: draggingTab });
        clickedTab = "";
        draggingTab = "";
        dragDx = 0;
        dragDy = 0;
        clickedTabBox = undefined;
    }

    function handleDragHandleMouseDown(e: MouseEvent) {
        draggingHandle = true;
        [dragDx, dragDy] = [0, 0];
        [dragEx, dragEy] = [e.clientX, e.clientY];
        dispatcher("handledragstart", { x: e.clientX, y: e.clientY });
    }

    function handleDragHandleMouseMove(e: MouseEvent) {
        if (!draggingHandle) return;
        dragDx = e.clientX - dragEx;
        dragDy = e.clientY - dragEy;
        dispatcher("handledrag", { x: e.clientX, y: e.clientY });
    }

    function handleDragHandleMouseUp(e: MouseEvent) {
        if (!draggingHandle) return;
        draggingHandle = false;
        dragDx = 0;
        dragDy = 0;
        dispatcher("handledrop", { x: e.clientX, y: e.clientY });
    }

    function handlePaneMouseDown(e: MouseEvent) {
        if (tabs.length > 0) return;
        const delta = Date.now() - lastClickTime;
        lastClickTime = Date.now();

        if (delta < 300) {
            dispatcher("paneclose");
            lastClickTime = 0;
        }
    }
</script>

<svelte:body
    on:mousemove={handleDragHandleMouseMove}
    on:mousemove={handleTabMouseMove}
    on:mouseup={handleDragHandleMouseUp}
    on:mouseup={handleTabMouseUp}
/>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="pane"
    bind:this={pane}
    class:dragging={draggingHandle}
    style:left="{position.left + halfDividerSize + (draggingHandle ? dragDx : 0)}px"
    style:top="{position.top + halfDividerSize + (draggingHandle ? dragDy : 0)}px"
    style:width="{position.width - dividerSize}px"
    style:height="{position.height - dividerSize}px"
    on:mousedown={handlePaneMouseDown}
>
    {#if tabs.length > 0}
        <div class="titlebar">
            <div
                class="drag-handle"
                class:single-tab={tabs.length == 1}
                role="button"
                tabindex="0"
                on:mousedown={handleDragHandleMouseDown}
            ></div>
            {#each tabs as tab}
                <div
                    class="tab"
                    class:selected={tab == selecting}
                    class:single-tab={tabs.length == 1}
                    role="button"
                    tabindex="0"
                    on:mousedown={e => handleTabMouseDown(e, tab)}
                    on:keydown={e => {
                        if (e.code == "Space" || e.code == "Enter") dispatcher("opentab", tab);
                    }}
                >{tabNames(tab)}</div>
            {/each}
            {#if tabs.length > 1}
                <div class="drag-handle-full-bar" on:mousedown={handleDragHandleMouseDown}></div>
            {/if}
        </div>
        <div class="content">
            <slot />
        </div>
    {:else}
        <div class="guide">
            Double click to remove, or drag existing tab/pane here.
        </div>
    {/if}
</div>

{#if draggingTab != ""}
    <div
        class="detached-tab"
        style:left="{dragDx + (clickedTabBox?.left ?? 0)}px"
        style:top="{dragDy + (clickedTabBox?.top ?? 0)}px"
    >{tabNames(draggingTab)}</div>
{/if}

<style lang="scss">
    .pane {
        position: absolute;
        border: 1px solid var(--pane-border-normal);
        box-sizing: border-box;
        background-color: var(--pane-background);

        &.dragging {
            z-index: 1;
        }

        &:hover {
            border: 1px solid var(--pane-border-focused);
        }

        .titlebar {
            display: flex;
            flex-direction: row;
            height: 34px;
            background-color: var(--pane-pane-header);
            overflow-x: scroll;

            &::-webkit-scrollbar {
                display: none;
            }

            .drag-handle {
                position: relative;
                width: 24px;
                min-width: 24px;
                cursor: grab;

                &:active {
                    cursor: grabbing;
                }

                &::before {
                    content: '';
                    position: absolute;
                    width: 2px;
                    height: 16px;
                    top: 50%;
                    left: 50%;
                    translate: -50% -50%;
                    border-radius: 8px;
                    background-color: #0000003f;
                    box-shadow:
                        -4px 0px #0000003f,
                        4px 0px #0000003f;
                }

                &.single-tab {
                    display: none;
                }
            }

            .tab {
                padding: 10px;

                &:hover {
                    background-color: #0000000f;
                }

                &.selected {
                    background-color: var(--pane-background);
                }

                &.single-tab {
                    background-color: transparent;
                    width: 100%;
                    cursor: grab;

                    &:active {
                        cursor: grabbing;
                    }
                }
            }

            .drag-handle-full-bar {
                flex: 1 1 auto;
                cursor: grab;

                &:active {
                    cursor: grabbing;
                }
            }
        }

        .content {
            position: relative;
            width: 100%;
            height: calc(100% - 34px);
        }

        .guide {
            position: absolute;
            top: 50%;
            left: 50%;
            translate: -50% -50%;
            color: #acacac;
        }
    }

    .detached-tab {
        position: absolute;
        padding: 10px;
        border: 1px solid #1e1e1e;
        background-color: #fff;
        box-sizing: border-box;
        z-index: 1;
    }
</style>