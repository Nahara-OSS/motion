<script lang="ts">
    import type { Easing, IAnimatable, IObjectContainer, IObjectProperty, ISceneContainerObject, Keyframe, SceneObjectInfo } from "@nahara/motion";
    import Button from "../input/Button.svelte";
    import { createEventDispatcher } from "svelte";
    import { snapping } from "../../snapping";
    import { openMenuAt } from "../menu/MenuHost.svelte";

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
    let prevTimeStart = 0;
    // TODO implement multiselect dragging

    function handleLifespanDragStart(e: MouseEvent) {
        draggingLifespan = true;
        eventEx = e.clientX;
        oldTimeStart = prevTimeStart = object.timeStart;
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
            const deltaTime = nextTimeStart - prevTimeStart;
            object.timeStart = nextTimeStart;
            object.timeEnd = oldTimeEnd + (nextTimeStart - oldTimeStart);
            prevTimeStart = nextTimeStart;

            // Hold shift to ignore keyframes
            if (!e.shiftKey) {
                const animatedProps: IAnimatable<any>[] = (object.object.properties as any[])
                    .filter(v => !v["isSimple"])
                    .filter(v => (v as IAnimatable<any>).animated);

                for (const prop of animatedProps) {
                    for (const kf of [...prop]) prop.modify(kf, { time: kf.time + deltaTime });
                }
            }

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

    function handleKeyframeContextMenu<T>(e: MouseEvent, prop: IAnimatable<T>, keyframe: Keyframe<T>) {
        e.preventDefault();
        openMenuAt(e.clientX, e.clientY, [
            {
                type: "tree",
                name: "Easing",
                children: ([
                    ["linear", "Linear", "easing.linear"],
                    ["hold", "Hold", "easing.hold"],
                    ["ease-in", "Ease in", "easing.in"],
                    ["ease-out", "Ease out", "easing.out"],
                    ["ease-in-out", "Ease in out", "easing.inout"]
                ] as [Easing, string, string][]).map(s => ({
                    type: "simple",
                    name: s[1],
                    icon: s[2],
                    click() {
                        prop.modify(keyframe, { easing: s[0] });
                    },
                }))
            },
            {
                type: "simple",
                name: "Seek to this",
                click() { dispatcher("seekto", keyframe.time); }
            },
            {
                type: "simple",
                name: "Delete keyframe",
                icon: "delete",
                click() {
                    prop.delete(keyframe);
                    dispatcher("update", object);
                },
            }
        ]);
    }

    let draggingKeyframe: Keyframe<any> | undefined = undefined;
    let draggingKeyframeInProp: IAnimatable<any> | undefined = undefined;
    let oldKeyframeTime = 0;
    let draggedKeyframe = false;

    function handleKeyframeDragStart<T>(e: MouseEvent, prop: IAnimatable<T>, keyframe: Keyframe<T>) {
        draggingKeyframe = keyframe;
        draggingKeyframeInProp = prop;
        oldKeyframeTime = keyframe.time;
        draggedKeyframe = false;
        eventEx = e.clientX;
    }

    function handleKeyframeDrag(e: MouseEvent) {
        if (!draggingKeyframe) return;
        draggingKeyframe = draggingKeyframeInProp!.modify(draggingKeyframe, {
            time: snapping.snapTimeline(Math.max(oldKeyframeTime + (e.clientX - eventEx) * 1000 / zoom, 0))
        }) ?? undefined;
        draggedKeyframe = true;
        dispatcher("update", object);
    }

    function handleKeyframeDrop() {
        if (!draggingKeyframe) return;
        if (!draggedKeyframe) dispatcher("seekto", draggingKeyframe.time);
        draggingKeyframe = undefined;
        draggingKeyframeInProp = undefined;
    }
</script>

<svelte:body
    on:mousemove={handleDrag}
    on:mousemove={handleKeyframeDrag}
    on:mouseup={handleDrop}
    on:mouseup={handleKeyframeDrop}
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
                                role="button"
                                tabindex="0"
                                style:left="{(keyframe.time - scroll) * zoom / 1000}px"
                                on:contextmenu={e => handleKeyframeContextMenu(e, prop, keyframe)}
                                on:mousedown={e => handleKeyframeDragStart(e, prop, keyframe)}
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