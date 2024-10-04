<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import TimelineTrack from "./TimelineTrack.svelte";
    import { app } from "../../appglobal";
    import { snapping } from "../../snapping";
    import Button from "../input/Button.svelte";
    import Dropdown from "../input/Dropdown.svelte";
    import { openPopupAt } from "../popup/PopupHost.svelte";
    import TimelineOptionsPopup from "./TimelineOptionsPopup.svelte";

    interface TimelinePaneState {
        labelWidth?: number;
        zoom?: number;
        scroll?: number;
        followSeekhead?: boolean;
    }

    export let state: TimelinePaneState;
    let labelWidth = state.labelWidth ?? 200;
    let zoom = state.zoom ?? 100; // 100 CSS pixels per second
    let scroll = state.scroll ?? 0;
    let followSeekhead = state.followSeekhead ?? false;
    let displaySeconds: string, displayMillis: string;
    let seekbar: HTMLDivElement;
    let tracksContainer: HTMLDivElement;
    let tracksContainerHeight = 0;

    $: {
        state.labelWidth = labelWidth;
        state.scroll = scroll;
        state.zoom = zoom;
        state.followSeekhead = followSeekhead;
    }

    const currentScene = app.currentSceneStore;
    const currentSelection = app.currentSelectionStore;
    const seekhead = app.currentSeekheadStore;
    const dispatcher = createEventDispatcher();

    $: {
        let timeInSeconds = Math.floor($seekhead.position / 1000);
        let seconds = (timeInSeconds % 60).toString().padStart(2, "0");
        let minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
        displaySeconds = `${minutes}:${seconds}.`;
        displayMillis = Math.floor($seekhead.position % 1000).toString().padStart(3, "0");
    }

    $: {
        if (followSeekhead && seekbar) {
            const width = seekbar.getBoundingClientRect().width;
            const headPosX = ($seekhead.position - scroll) * zoom / 1000;

            if (headPosX > width * 3 / 4) {
                scroll = $seekhead.position - (width * 3 / 4 * 1000 / zoom);
            } else if (headPosX < 0) {
                scroll = Math.max($seekhead.position, 0);
            }
        }
    }

    $: tracksContainerHeight = tracksContainer?.offsetHeight;

    let draggingSeekhead = false;
    let mouseEx = 0;
    let prevPosition = 0;

    function handleSeekheadMouseDown(e: MouseEvent) {
        draggingSeekhead = true;
        mouseEx = e.clientX;
        prevPosition = $seekhead.position;
    }

    function handleSeekheadMouseMove(e: MouseEvent) {
        if (!draggingSeekhead) return;
        const nextPos = snapping.snapTimeline(Math.max(prevPosition + (e.clientX - mouseEx) * 1000 / zoom, 0));
        app.updateSeekhead({ ...$seekhead, position: nextPos });
    }

    function handleSeekheadMouseUp(e: MouseEvent) {
        draggingSeekhead = false;
    }

    function handleWheelEvent(e: WheelEvent) {
        const deltaX = e.shiftKey ? e.deltaY : e.deltaX;
        const deltaY = e.shiftKey ? e.deltaX : e.deltaY;

        if (e.ctrlKey) {
            const seekbarLeft = seekbar.getBoundingClientRect().left;
            scroll += (e.clientX - seekbarLeft) * 1000 / zoom;
            zoom = Math.max(Math.min(zoom - deltaY, 1000), 1);
            scroll -= (e.clientX - seekbarLeft) * 1000 / zoom;
            scroll = Math.max(scroll, 0);
            e.preventDefault();
        } else {
            scroll = Math.max(scroll + deltaX * 1000 / zoom, 0);
        }
    }

    function handleSeekbarMouseDown(e: MouseEvent) {
        app.updateSeekhead({ ...$seekhead, position: snapping.snapTimeline(scroll + e.offsetX * 1000 / zoom) });
        draggingSeekhead = true;
        mouseEx = e.clientX;
        prevPosition = $seekhead.position;
    }

    function handleOptionsButtonClick(e: MouseEvent) {
        openPopupAt(e.clientX, e.clientY, "Timeline", TimelineOptionsPopup, {
            state,
            onUpdate() {
                scroll = state.scroll ?? 0;
                zoom = state.zoom ?? 100;
                labelWidth = state.labelWidth ?? 200;
                followSeekhead = state.followSeekhead ?? false;
            }
        });
    }

    onMount(() => {
        let obserer = new ResizeObserver(() => tracksContainer = tracksContainer);
        obserer.observe(tracksContainer);
        return () => obserer.disconnect();
    });
</script>

<svelte:body
    on:mousemove={handleSeekheadMouseMove}
    on:mouseup={handleSeekheadMouseUp}
/>

<div class="wrapper">
    <div class="actions-seekbar-combo">
        <div class="actions" style:width="{labelWidth}px">
            <Dropdown label="Options" on:click={handleOptionsButtonClick} />
        </div>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="seekbar" bind:this={seekbar} on:mousedown|self={handleSeekbarMouseDown} on:wheel={handleWheelEvent}>
            <div
                class="seekhead"
                role="button"
                tabindex="0"
                style:left="{($seekhead.position - scroll) * zoom / 1000}px"
                style:--tracks-height="{tracksContainerHeight}px"
                on:mousedown={handleSeekheadMouseDown}
            ></div>
        </div>
    </div>
    <div class="tracks" bind:this={tracksContainer} on:wheel={handleWheelEvent}>
        {#if $currentScene}
            {#each [...$currentScene].reverse() as object}
                <TimelineTrack
                    {labelWidth} {zoom} {object} {scroll}
                    selectStateQuery={o =>
                        o == $currentSelection?.primary ? "primary"
                        : ($currentSelection?.multiple ?? []).includes(o) ? "secondary"
                        : "none"}
                    on:update={() => currentScene.update(a => a)}
                    on:seekto={e => app.updateSeekhead({ ...$seekhead, position: e.detail })}
                    on:select={e => app.selectSingle(e.detail)}
                />
            {/each}
        {/if}
    </div>
</div>

<style lang="scss">
    .wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
    }

    .tracks {
        flex: 1 1 auto;
        overflow-y: scroll;
        &::-webkit-scrollbar { display: none; }
    }

    .actions-seekbar-combo {
        display: flex;
        height: 24px;
        align-items: center;
        border-bottom: 1px solid #d1d1d1;
        
        .actions {
            display: flex;
            box-sizing: border-box;
        }

        .seekbar {
            height: 24px;
            flex: 1 1 auto;
            position: relative;

            .seekhead {
                position: absolute;
                cursor: ew-resize;
                width: 1px;
                height: calc(24px + var(--tracks-height));
                translate: -50% 0;
                background-color: #ffafaf;
                border-left: 1px solid #ff5c5c;
                border-right: 1px solid #ff5c5c;

                &::before {
                    content: '';
                    position: absolute;
                    left: 50%;
                    top: 11px;
                    translate: -50% 0;
                    width: 11px;
                    height: 11px;
                    background-color: #ffafaf;
                    border: 1px solid #ff5c5c;
                    rotate: 45deg;
                    border-top: unset;
                    border-left: unset;
                }

                &::after {
                    content: '';
                    position: absolute;
                    left: 50%;
                    top: 0;
                    width: 16px;
                    height: 16px;
                    translate: -50% 0;
                    background-color: #ffafaf;
                    border: 1px solid #ff5c5c;
                    border-bottom: unset;
                }

                &:hover, &:active {
                    background-color: #ff5c5c;

                    &::before, &::after {
                        background-color: #ff5c5c;
                    }
                }
            }
        }
    }
</style>