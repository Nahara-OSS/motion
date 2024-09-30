<script lang="ts">
    import { onMount } from "svelte";
    import { app } from "../../appglobal";
    import { AnimatableObjectProperty, type IAnimatable, type Vec2 } from "@nahara/motion";

    let labelWidth = 200;
    let verticalZoom = 1; // 1 unit per pixel
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

    onMount(() => {
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.offsetWidth * devicePixelRatio;
            canvas.height = canvas.offsetHeight * devicePixelRatio;
            renderTimeline();
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    });

    function cubicBezierLine(ctx: CanvasRenderingContext2D, cp1: Vec2, cp2: Vec2, from: Vec2, to: Vec2) {
        const width = to.x - from.x;
        const height = to.y - from.y;
        ctx.bezierCurveTo(
            from.x + cp1.x * width, from.y + cp1.y * height,
            to.x + cp2.x * width, to.y + cp2.y * height,
            to.x, to.y
        );
    }

    function renderTimeline() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        ctx.reset();
        ctx.scale(devicePixelRatio, devicePixelRatio);

        if (selectedProperty && typeof selectedProperty.animatable.defaultValue == "number") {
            let firstPoint = false;
            let lastX = 0;
            let lastY = canvas.offsetHeight / 2 - selectedProperty.animatable.defaultValue / verticalZoom;
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);

            for (const keyframe of selectedProperty.animatable) {
                if (typeof keyframe.value != "number") break;
                const x = (keyframe.time - horizontalScroll) * horizontalZoom / 1000;
                const y = canvas.offsetHeight / 2 - keyframe.value / verticalZoom;

                if (!firstPoint) {
                    firstPoint = true;
                    if (x == 0) ctx.moveTo(x, y);
                    else {
                        ctx.lineTo(x, lastY);
                        ctx.lineTo(x, y);
                    }
                } else if (typeof keyframe.easing == "string") {
                    switch (keyframe.easing) {
                        case "linear": ctx.lineTo(x, y); break;
                        case "hold":
                            ctx.lineTo(x, lastY);
                            ctx.lineTo(x, y);
                            break;
                        case "ease-in":
                            cubicBezierLine(
                                ctx,
                                { x: 0.42, y: 0 },
                                { x: 0, y: 0 },
                                { x: lastX, y: lastY }, { x, y }
                            );
                            break;
                        case "ease-out":
                            cubicBezierLine(
                                ctx,
                                { x: 0, y: 0 },
                                { x: -0.42, y: 0 },
                                { x: lastX, y: lastY }, { x, y }
                            );
                            break;
                        case "ease-in-out":
                            cubicBezierLine(
                                ctx,
                                { x: 0.42, y: 0 },
                                { x: -0.42, y: 0 },
                                { x: lastX, y: lastY }, { x, y }
                            );
                            break;
                        default: ctx.lineTo(x, y); break;
                    }
                } else {
                    ctx.lineTo(x, y); // TODO
                }

                lastX = x;
                lastY = y;
            }

            ctx.lineTo(canvas.offsetWidth, lastY);
            ctx.stroke();
            ctx.closePath();
        }
    }
</script>

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
    <canvas bind:this={canvas} style:width="calc(100% - {labelWidth}px)"></canvas>
</div>

<style lang="scss">
    .graph-pane {
        display: flex;
        flex-direction: row;
        height: 100%;

        .properties-list, canvas {
            height: 100%;
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