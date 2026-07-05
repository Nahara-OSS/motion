<script lang="ts" generics="T">
    import type { Snippet } from "svelte";
    import Button from "./Button.svelte";
    import IconLabel from "./IconLabel.svelte";
    import { trackPointer } from "../util/trackPointer";

    const {
        tabs,
        dragging,
        tabSelected,
        tabKey,
        tabLabel,
        onTabSelect,
        onTabDrag,
        onTabDrop,
        onTabClose,
        onWindowDrag,
        onResizerDrag,
        onWindowClose,
        children,
    }: {
        tabs: readonly T[];
        dragging: boolean;
        tabSelected: (tab: T) => boolean;
        tabKey: (tab: T) => unknown;
        tabLabel: Snippet<[tab: T]>;
        onTabSelect: (tab: T) => unknown;
        onTabDrag: (e: PointerEvent, tab: T) => unknown;
        onTabDrop: (insertAt: number) => unknown;
        onTabClose: (tab: T) => unknown;
        onWindowDrag?: (e: PointerEvent) => unknown;
        onResizerDrag?: (e: PointerEvent) => unknown;
        onWindowClose?: () => unknown;
        children: Snippet<[]>;
    } = $props();

    function onTitlebarPointerDown(e: PointerEvent) {
        e.preventDefault();
        if (onWindowDrag) onWindowDrag(e);
    }

    function onTitlebarPointerUp() {
        if (dragging) {
            onTabDrop(tabs.length);
        }
    }

    function onTabPointerDown(e: PointerEvent, tab: T) {
        e.preventDefault();
        e.stopPropagation();

        if (!e.ctrlKey && tabs.length == 1) {
            if (onWindowDrag) onWindowDrag(e);
            return;
        }

        const cancel = trackPointer(e, (e) => {
            e.preventDefault();
            cancel();
            if (tabs.length > 1 || onWindowClose) onTabDrag(e, tab);
        });
    }

    function onTabPointerUp(e: PointerEvent & { currentTarget: HTMLButtonElement }, index: number) {
        if (dragging) {
            const { left, right } = e.currentTarget.getBoundingClientRect();
            const lDistance = e.clientX - left;
            const rDistance = right - e.clientX;
            const insertAt = lDistance < rDistance ? index : index + 1;
            onTabDrop(insertAt);
        }
    }

    function closeTab(e: MouseEvent, tab: T) {
        e.stopPropagation();
        onWindowClose && tabs.length == 1 ? onWindowClose() : onTabClose(tab);
    }
</script>

<div class="window-content" class:multiple-tabs={tabs.length != 1}>
    <header>
        {#if tabs.length != 1 && onWindowDrag}
            <div class="window-buttons">
                <Button style="toolbar" onPointerDown={onWindowDrag}>
                    <IconLabel type="drag-handle" />
                </Button>
            </div>
            <div class="separator"></div>
        {/if}
        <div class="tabs">
            {#each tabs as tab, i (tabKey(tab))}
                <button
                    class="tab"
                    tabindex="0"
                    class:selected={tabSelected(tab)}
                    onpointerdown={(e) => onTabPointerDown(e, tab)}
                    onpointerup={(e) => onTabPointerUp(e, i)}
                    onclick={() => onTabSelect(tab)}
                >
                    <div class="label">
                        {@render tabLabel(tab)}
                    </div>
                    {#if tabs.length != 1}
                        <Button style="toolbar" onClick={(e) => closeTab(e, tab)}>
                            <IconLabel type="close" />
                        </Button>
                    {/if}
                </button>
            {/each}
            <div class="fill" role="none" onpointerdown={onTitlebarPointerDown} onpointerup={onTitlebarPointerUp}></div>
        </div>
        {#if tabs.length != 1 && onWindowClose}
            <div class="separator"></div>
        {/if}
        {#if onWindowClose}
            <div class="window-buttons">
                <Button style="toolbar" onClick={onWindowClose}>
                    <IconLabel type="close" />
                </Button>
            </div>
        {/if}
    </header>
    <main>
        {@render children()}
    </main>
    {#if onResizerDrag}
        <div class="resizer" role="none" onpointerdown={onResizerDrag}></div>
    {/if}
</div>

<style>
    .window-content {
        width: 100%;
        height: 100%;
        background-color: #efefef;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;

        > header {
            display: flex;
            flex-direction: row;
            align-items: center;
            height: 3rem;

            > .tabs {
                width: 0;
                flex-grow: 1;
                overflow-y: scroll;
                display: flex;
                flex-direction: row;
                height: 3rem;

                &::-webkit-scrollbar {
                    display: none;
                }

                > .tab {
                    appearance: none;
                    -webkit-appearance: none;
                    font-family: inherit;
                    font-size: inherit;
                    border: 0;
                    background-color: transparent;
                    padding: 0.5rem;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: row;
                    white-space: nowrap;
                    gap: 0.2rem;

                    > .label {
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        user-select: none;
                        padding: 0.2rem;
                        border: 1px solid transparent;
                    }
                }

                > .fill {
                    width: 0;
                    flex-grow: 1;
                }
            }

            > .separator {
                width: 1px;
                height: 2rem;
                background-color: #dfdfdf;
            }

            > .window-buttons {
                padding: 0.5rem;
                display: flex;
                flex-direction: row;
            }
        }

        &.multiple-tabs {
            background-color: #ffffff;

            > header {
                background-color: #efefef;

                > .tabs > .tab {
                    &:hover {
                        background-color: #0000000f;
                    }

                    &:active {
                        background-color: #00000017;
                    }

                    &.selected {
                        background-color: #ffffff;
                    }
                }
            }
        }

        > main {
            height: 0;
            flex-grow: 1;
        }

        > .resizer {
            position: absolute;
            bottom: 0;
            right: 0;
            border-bottom: 1rem solid #000000;
            border-left: 1rem solid transparent;
            opacity: 0.1;
            cursor: nw-resize;

            &:hover {
                opacity: 0.25;
            }

            &:active {
                opacity: 0.5;
            }
        }
    }
</style>
