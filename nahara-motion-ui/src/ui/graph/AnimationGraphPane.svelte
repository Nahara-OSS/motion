<script lang="ts">
    import { onMount } from "svelte";
    import { app } from "../../appglobal";
    import { AnimatableObjectProperty } from "@nahara/motion";
    import { graph } from "./graph";

    let labelWidth = 200;
    let verticalZoom: number | "auto" = "auto";
    let verticalScroll = 0; // 0 at vertical center of graph
    let horizontalZoom = 100;
    let horizontalScroll = 0;

    const currentScene = app.currentSceneStore;
    const currentSelection = app.currentSelectionStore;
    const seekhead = app.currentSeekheadStore;

    let canvas: HTMLCanvasElement;
    let properties: AnimatableObjectProperty<any>[] = [];
    let selectedProperty: AnimatableObjectProperty<any> | undefined = undefined;
    $: {
        properties = $currentSelection?.primary.object.properties.filter(v => v instanceof AnimatableObjectProperty) ?? [];
        if (selectedProperty && !properties.includes(selectedProperty)) selectedProperty = undefined;
        if (!selectedProperty) selectedProperty = properties[0];
    }
    $: { $seekhead; properties; $currentScene; renderTimeline(); }

    const state: graph.State = {
        get property() { return selectedProperty?.animatable; },
        get allProperties() { return properties.map(v => v.animatable); },
        selectedKeyframes: [],
        adjustingKeyframe: undefined,
        adjustHandleType: "self",
        get horizontalScroll() { return horizontalScroll; },
        set horizontalScroll(v: number) { horizontalScroll = v; },
        get horizontalZoom() { return horizontalZoom; },
        set horizontalZoom(v: number) { horizontalZoom = v; },
        get verticalScroll() { return verticalScroll; },
        set verticalScroll(v: number) { verticalScroll = v; },
        get verticalZoom() { return verticalZoom; },
        set verticalZoom(v: number | "auto") { verticalZoom = v; },
    };

    onMount(() => {
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.offsetWidth * devicePixelRatio;
            canvas.height = canvas.offsetHeight * devicePixelRatio;
            renderTimeline();
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    });

    function renderTimeline() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        ctx.reset();
        ctx.scale(devicePixelRatio, devicePixelRatio);

        graph.renderGraph(state, ctx, canvas.offsetWidth, canvas.offsetHeight);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ff5f5f";
        const seekX = ($seekhead.position - horizontalScroll) * horizontalZoom / 1000;
        ctx.beginPath();
        ctx.moveTo(seekX, 0);
        ctx.lineTo(seekX, canvas.offsetHeight);
        ctx.stroke();
    }

    function eventToCanvasXy(e: MouseEvent): [number, number] {
        const { left, top } = canvas.getBoundingClientRect();
        return [e.clientX - left, e.clientY - top];
    }

    function handleMouseDown(e: MouseEvent) {
        graph.handleMouseDown(state, ...eventToCanvasXy(e), canvas.offsetWidth, canvas.offsetHeight);
        renderTimeline();
    }

    function handleMouseMove(e: MouseEvent) {
        graph.handleMouseMove(state, ...eventToCanvasXy(e), canvas.offsetWidth, canvas.offsetHeight);
        if (state.adjustingKeyframe) currentScene.update(a => a);
    }

    function handleMouseUp(e: MouseEvent) {
        graph.handleMouseUp(state, ...eventToCanvasXy(e), canvas.offsetWidth, canvas.offsetHeight);
        renderTimeline();
    }

    function handleWheel(e: WheelEvent) {
        horizontalScroll = Math.max(horizontalScroll + e.deltaX * 1000 / horizontalZoom, 0);
        if (typeof verticalZoom == "number") verticalScroll -= e.deltaY * verticalZoom;
        renderTimeline();
    }
</script>

<svelte:body
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
/>

<div class="graph-pane">
    <div class="properties-list" style:width="{labelWidth}px">
        {#if $currentSelection}
            {#each properties as prop}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="property"
                    role="button"
                    tabindex="0"
                    class:selected={selectedProperty == prop}
                    on:click={() => selectedProperty = prop}
                >
                    <div class="label">{prop.translationKey}</div>
                </div>
            {/each}
        {/if}
    </div>
    <canvas
        bind:this={canvas}
        style:width="calc(100% - {labelWidth}px)"
        on:mousedown={handleMouseDown}
        on:wheel={handleWheel}
    ></canvas>
</div>

<style lang="scss">
    .graph-pane {
        display: flex;
        flex-direction: row;
        height: 100%;

        .properties-list, canvas {
            height: 100%;
        }

        canvas {
            overscroll-behavior: none;
        }
    }

    .properties-list {
        overflow-y: scroll;

        .property {
            display: flex;
            flex-direction: row;
            height: 24px;
            padding-left: 3px;

            &:hover { background-color: #0000000f; }
            &.selected { background-color: #0000001f; }

            .label {
                flex: 1 1 auto;
                padding: 5px;
                box-sizing: border-box;
            }
        }
    }
</style>