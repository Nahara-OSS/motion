<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import Button from "../input/Button.svelte";
    import TimelineTrack from "./TimelineTrack.svelte";
    import { app } from "../../appglobal";
    import { snapping } from "../../snapping";

    let labelWidth = 200;
    let zoom = 100; // 100 CSS pixels per second
    let scroll = 0;
    let displaySeconds: string, displayMillis: string;
    let tracksContainer: HTMLDivElement;
    let tracksContainerHeight = 0;

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
            zoom = Math.max(Math.min(zoom - deltaY, 1000), 1);
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
        </div>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="seekbar" on:mousedown|self={handleSeekbarMouseDown} on:wheel={handleWheelEvent}>
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
        padding: 5px 0 0;
        align-items: center;
        border-bottom: 1px solid #d1d1d1;
        
        .actions {
            display: flex;
            padding-left: 8px;
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