<script lang="ts">
    import type { Vec2 } from "@nahara/motion";
    import { onMount } from "svelte";

    export let controlPointA: Vec2;
    export let controlPointB: Vec2;
    export let lineColor = "#1d1d1d";
    export let lineWidth = 1;
    export let controlPointLineColor = "#d1d1d1";
    export let controlPointLineWidth = 1;
    let canvas: HTMLCanvasElement;
    $: { controlPointA; controlPointB; render(); }

    function render() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        ctx.reset();
        ctx.scale(devicePixelRatio, devicePixelRatio);
        const width = canvas.offsetWidth, height = canvas.offsetHeight;

        ctx.strokeStyle = controlPointLineColor;
        ctx.lineWidth = controlPointLineWidth;
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(controlPointA.x * width, (1 - controlPointA.y) * height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width, 0);
        ctx.lineTo((controlPointB.x + 1) * width, -controlPointB.y * height);
        ctx.stroke();

        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.bezierCurveTo(
            controlPointA.x * width, (1 - controlPointA.y) * height,
            (controlPointB.x + 1) * width, -controlPointB.y * height,
            width, 0
        );
        ctx.stroke();
    }

    let draggingControlPoint = 0;
    let eventEx = 0, eventEy = 0;
    let oldControlPoint: Vec2;

    function handleControlPointMouseDown(e: MouseEvent, cp: 1 | 2) {
        draggingControlPoint = cp;
        eventEx = e.clientX;
        eventEy = e.clientY;
        oldControlPoint = { ...[controlPointA, controlPointB][cp - 1] };
    }

    function handleControlPointMouseMove(e: MouseEvent) {
        if (draggingControlPoint == 0) return;
        const dx = e.clientX - eventEx;
        const dy = e.clientY - eventEy;
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        const cpXRange = draggingControlPoint == 1 ? [0, 1] : [-1, 0];
        const cpX = Math.min(Math.max(oldControlPoint.x + dx / w, cpXRange[0]), cpXRange[1]);
        const cpY = oldControlPoint.y - dy / h;
        const cp = { x: cpX, y: cpY };
        if (draggingControlPoint == 1) controlPointA = cp;
        if (draggingControlPoint == 2) controlPointB = cp;
    }

    function handleControlPointMouseUp(e: MouseEvent) {
        if (draggingControlPoint == 0) return;
        draggingControlPoint = 0;
    }

    onMount(() => {
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.offsetWidth * devicePixelRatio;
            canvas.height = canvas.offsetHeight * devicePixelRatio;
            render();
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    });
</script>

<svelte:body
    on:mousemove={handleControlPointMouseMove}
    on:mouseup={handleControlPointMouseUp}
/>

<div class="bezier-graph">
    <canvas bind:this={canvas}></canvas>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="control-point"
        style:left="calc(10px + (100% - 20px) * {controlPointA.x})"
        style:top="calc(10px + (100% - 20px) * {1 - controlPointA.y})"
        on:mousedown={e => handleControlPointMouseDown(e, 1)}
    ></div>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="control-point"
        style:left="calc(10px + (100% - 20px) * {controlPointB.x + 1})"
        style:top="calc(10px + (100% - 20px) * {-controlPointB.y})"
        on:mousedown={e => handleControlPointMouseDown(e, 2)}
    ></div>
</div>

<style lang="scss">
    .bezier-graph {
        position: relative;
        width: 100%;
        height: 100%;

        canvas {
            position: absolute;
            top: 10px; left: 10px;
            width: calc(100% - 20px);
            height: calc(100% - 20px);
            border: 1px solid #d1d1d1;
        }

        .control-point {
            position: absolute;
            width: 0;
            height: 0;
            cursor: grab;

            &:active {
                cursor: grabbing;
            }

            &::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                translate: -50% -50%;
                width: 14px;
                height: 14px;
                background-color: #fff;
                border: 2px solid #d1d1d1;
                border-radius: 1000px;
            }

            &:hover::before {
                border: 2px solid #1d1d1d;
            }
        }
    }
</style>