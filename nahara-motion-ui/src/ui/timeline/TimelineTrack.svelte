<script lang="ts">
    import type { IAnimatable, IObjectContainer, IObjectProperty, ISceneContainerObject, SceneObjectInfo } from "@nahara/motion";
    import Button from "../input/Button.svelte";
    import { createEventDispatcher } from "svelte";
    import { snapping } from "../../snapping";

    // BIG AHH TODO: Weed out objects that are outside the visible timeline area

    export let object: SceneObjectInfo;
    export let labelWidth: number;
    export let zoom: number;
    export let scroll: number;

    let expanded = false;
    let animatedProperties: IAnimatable<any>[] = [];
    let childrenObjs: IObjectContainer | undefined = undefined;

    $: animatedProperties = (object.object.properties
        .filter(o => !(o as IObjectProperty<any>).isSimple) as IAnimatable<any>[])
        .filter(p => p.animated);
    $: childrenObjs = (object.object as ISceneContainerObject).isContainer
        ? (object.object as ISceneContainerObject)
        : undefined;

    const dispatcher = createEventDispatcher();
    
    let draggingLifespan = false;
    let draggingPulltab: "left" | "right" | "none" = "none";
    let eventEx = 0;
    let oldTimeStart = 0, oldTimeEnd = 0;
    // TODO implement multiselect dragging

    function handleLifespanDragStart(e: MouseEvent) {
        draggingLifespan = true;
        eventEx = e.clientX;
        oldTimeStart = object.timeStart;
        oldTimeEnd = object.timeEnd;
    }

    function handlePulltabDragStart(e: MouseEvent, side: "left" | "right") {
        draggingPulltab = side;
        eventEx = e.clientX;
        oldTimeStart = object.timeStart;
        oldTimeEnd = object.timeEnd;
    }

    function handleDrag(e: MouseEvent) {
        const eventDx = e.clientX - eventEx;

        if (draggingLifespan) {
            const nextTimeStart = snapping.snapTimeline(Math.max(oldTimeStart + eventDx * 1000 / zoom, 0));
            object.timeStart = nextTimeStart;
            object.timeEnd = oldTimeEnd + (nextTimeStart - oldTimeStart);
            dispatcher("update", object);
        }

        if (draggingPulltab != "none") {
            if (draggingPulltab == "left") {
                const next = snapping.snapTimeline(Math.max(oldTimeStart + eventDx * 1000 / zoom, 0));
                object.timeStart = next;
            } else {
                const next = snapping.snapTimeline(Math.max(oldTimeEnd + eventDx * 1000 / zoom, 0));
                object.timeEnd = next;
            }

            dispatcher("update", object);
        }
    }

    function handleDrop(e: MouseEvent) {
        draggingLifespan = false;
        draggingPulltab = "none";
    }
</script>

<svelte:body
    on:mousemove={handleDrag}
    on:mouseup={handleDrop}
/>

<div class="object">
    <div class="track">
        <div class="left" style:width="{labelWidth}px">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                role="button"
                tabindex="0"
                class="expand-button"
                class:expanded
                on:click={() => expanded = !expanded}
            ></div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                role="button"
                tabindex="0"
                class="label"
                on:click={() => expanded = !expanded}
            >{object.name}</div>
        </div>
        <div class="timeline">
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="object-lifespan"
                style:left="{(object.timeStart - scroll) * zoom / 1000}px"
                style:width="{(object.timeEnd - object.timeStart) * zoom / 1000}px"
                style:background-color="{object.color}"
                on:mousedown|self={handleLifespanDragStart}
            >
                <div class="pulltab-left" on:mousedown={e => handlePulltabDragStart(e, "left")}></div>
                <div class="pulltab-right" on:mousedown={e => handlePulltabDragStart(e, "right")}></div>
            </div>
        </div>
    </div>
    {#if expanded}
        <div class="children-tracks">
            {#each animatedProperties as prop}
                <div class="track">
                    <div class="left" style:width="{labelWidth - 24}px">
                        <div class="label">{prop.translationKey}</div>
                        <Button label="Clear" on:click={() => { prop.clear(); dispatcher("update", object) }} />
                    </div>
                    <div class="timeline">
                        {#each prop as keyframe}
                            <div
                                class="keyframe"
                                style:left="{(keyframe.time - scroll) * zoom / 1000}px"
                            ></div>
                        {/each}
                    </div>
                </div>
            {/each}
            {#if childrenObjs}
                {#each childrenObjs as childObj}
                    <svelte:self object={childObj} labelWidth={labelWidth - 24} {zoom} {scroll} on:update />
                {/each}
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
    .track {
        display: flex;
        height: 24px;

        .timeline {
            flex: 1 1 auto;
            background-color: #0000000f;
            position: relative;
            overflow: hidden;

            .object-lifespan {
                position: absolute;
                top: 0;
                height: 24px;
                border: 1px solid #0000005f;
                box-sizing: border-box;
                cursor: grab;
                &:active { cursor: grabbing; }
            }

            .keyframe {
                position: absolute;
                width: 8px;
                height: 8px;
                top: 50%;
                translate: -50% -50%;
                rotate: 45deg;
                background-color: #fff;
                border: 2px solid #7f7f7f;
                cursor: pointer;

                &:hover { border: 2px solid #1d1d1d; }
            }
        }

        &:hover {
            background-color: #0000000f;
            .timeline { background-color: #0000000f; }
            .object-lifespan { border: 1px solid #1d1d1d; }
        }
    }

    .left {
        display: flex;
        height: 24px;

        .expand-button {
            position: relative;
            width: 24px;
            height: 24px;

            &::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                translate: -4px -4px;
                border: 4px solid transparent;
                border-top: 4px solid #7d7d7d;
                border-left: 4px solid #7f7f7f;
                rotate: 135deg;
            }

            &.expanded::before { rotate: 180deg; }
        }

        .label {
            flex: 1 1 auto;
            padding: 5px 8px;
        }
    }

    .pulltab-left, .pulltab-right {
        position: absolute;
        width: 10px;
        height: 100%;
        background-color: #0000001f;
        cursor: ew-resize;

        &:hover {
            background-color: #0000005f;
        }
    }

    .pulltab-left { left: 0; }
    .pulltab-right { right: 0; }

    .children-tracks {
        margin-left: 24px;

        > .track, > :global(.object) {
            position: relative;

            &::before, &::after {
                content: '';
                position: absolute;
                background-color: #d1d1d1;
            }

            & {
                &::before {
                    width: 1px;
                    height: 100%;
                    left: -12px;
                }

                &::after {
                    width: 12px;
                    height: 1px;
                    left: -12px;
                    top: 12px;
                }
            }

            &:last-child::before { height: 12px; }
        }
    }

    
    .object {
        &:hover {
            background-color: #0000000f;

            .children-tracks {
                > .track, > :global(.object) {
                    &::before, &::after {
                        background-color: #1d1d1d;
                    }
                }
            }
        }
    }
</style>