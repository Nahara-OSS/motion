<script lang="ts" module>
    export interface AnimatorEditorBox {
        readonly timeRange: readonly [start: number, end: number];
        readonly valueRange: readonly [start: number, end: number];
    }
</script>

<script lang="ts">
    import { animation } from "@nahara/motion";
    import { trackPointer } from "../util/trackPointer";
    import { getTheme } from "../theme";

    const {
        value,
        viewport,
        selectedIds,
        color = "#ff0000",
        timeSnap = 1,
        valueSnap = null,
        onValueChange,
        onViewportChange,
        onSelect,
    }: {
        value: animation.Animator;
        viewport: AnimatorEditorBox;
        selectedIds: string[];
        color?: string;
        timeSnap?: number;
        valueSnap?: number | null;
        onValueChange: (updater: (value: animation.Animator) => animation.Animator) => unknown;
        onViewportChange: (updater: (value: AnimatorEditorBox) => AnimatorEditorBox) => unknown;
        onSelect: (ids: string[]) => unknown;
    } = $props();

    let contentRect = $state.raw<DOMRectReadOnly | null>(null);
    let selecting = $state.raw<[animation.Point, animation.Point] | null>(null);
    const theme = getTheme();

    const visibleKeyframes = $derived(
        value.keyframes.filter((keyframe, i) => {
            if (contentRect == null) return false;
            const timeWindow = viewport.timeRange[1] - viewport.timeRange[0];
            const prev = value.keyframes[i - 1];
            const next = value.keyframes[i + 1];
            const startTick = prev?.target?.tick ?? keyframe.target.tick;
            const endTick = next?.target?.tick ?? keyframe.target.tick;
            const x1 = ((startTick - viewport.timeRange[0]) * contentRect.width) / timeWindow;
            const x2 = ((endTick - viewport.timeRange[0]) * contentRect.width) / timeWindow;
            return x2 >= 0 && x1 <= contentRect.width;
        }),
    );

    const selectedBounds = $derived(
        (selectedIds.length == 0 ? null : selectedIds)
            ?.flatMap((id) => {
                const k = value.keyframes.find((k) => k.keyframeId == id);
                if (k == null) return [];
                return [k.target];
            })
            .map((v) => [v, v])
            .reduce((acc, [a, b]) => [
                { tick: Math.min(acc[0].tick, a.tick, b.tick), value: Math.min(acc[0].value, a.value, b.value) },
                { tick: Math.max(acc[1].tick, a.tick, b.tick), value: Math.max(acc[1].value, a.value, b.value) },
            ]),
    );

    function pointToPx(point: animation.Point, rect: DOMRectReadOnly): [x: number, y: number] {
        const timeWindow = viewport.timeRange[1] - viewport.timeRange[0];
        const valueWindow = viewport.valueRange[1] - viewport.valueRange[0];
        const x = ((point.tick - viewport.timeRange[0]) * rect.width) / timeWindow;
        const y = ((point.value - viewport.valueRange[0]) * rect.height) / valueWindow;
        return [x, rect.height - y];
    }

    function useAltHandle(p1: animation.Point, p2: animation.Point, rect: DOMRectReadOnly): boolean {
        const a = pointToPx(p1, rect);
        const b = pointToPx(p2, rect);
        return (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 < 8 * 8;
    }

    function generatePath(rect: DOMRectReadOnly, fill: boolean): string {
        const visibleStartTick = visibleKeyframes[0]?.target?.tick;
        const visibleEndTick = visibleKeyframes[visibleKeyframes.length - 1]?.target?.tick;
        const startTick = Math.min(visibleStartTick ?? viewport.timeRange[0], viewport.timeRange[0]);
        const endTick = Math.max(visibleEndTick ?? viewport.timeRange[1], viewport.timeRange[1]);
        const start = pointToPx({ tick: startTick, value: animation.sampleAnimator(value, startTick) }, rect);
        const end = pointToPx({ tick: endTick, value: animation.sampleAnimator(value, endTick) }, rect);

        if (fill) {
            const valueWindow = viewport.valueRange[1] - viewport.valueRange[0];
            const yAtValueZero = (-viewport.valueRange[1] * rect.height) / -valueWindow;

            return [
                `M ${start[0]},${yAtValueZero}`,
                "L" + start,
                ...visibleKeyframes.map((k, i) => {
                    if (i == 0) return "L" + pointToPx(k.target, rect);
                    const p1 = pointToPx(visibleKeyframes[i - 1].rcp, rect);
                    const p2 = pointToPx(k.lcp, rect);
                    const p3 = pointToPx(k.target, rect);
                    return `C${p1},${p2},${p3}`;
                }),
                "L" + end,
                `L ${end[0]},${yAtValueZero}`,
            ].join(" ");
        } else {
            return [
                "M" + start,
                ...visibleKeyframes.map((k, i) => {
                    if (i == 0) return "L" + pointToPx(k.target, rect);
                    const p1 = pointToPx(visibleKeyframes[i - 1].rcp, rect);
                    const p2 = pointToPx(k.lcp, rect);
                    const p3 = pointToPx(k.target, rect);
                    return `C${p1},${p2},${p3}`;
                }),
                "L" + end,
            ].join(" ");
        }
    }

    function snapPoint(point: animation.Point): animation.Point {
        if (timeSnap <= 1 && valueSnap == null) return point;
        const tick = timeSnap <= 1 ? point.tick : Math.round(point.tick / timeSnap) * timeSnap;
        const value = valueSnap == null ? point.value : Math.round(point.value / valueSnap) * valueSnap;
        return { tick, value };
    }

    function readjustKeyframes(
        keyframe: animation.Keyframe,
        index: number,
        keyframes: animation.Keyframe[],
    ): animation.Keyframe {
        const lKeyframe: animation.Keyframe | undefined = keyframes[index - 1];
        const rKeyframe: animation.Keyframe | undefined = keyframes[index + 1];

        function clamp(x: number, lBound: number, rBound: number): number {
            if (x < lBound) return lBound;
            if (x > rBound) return rBound;
            return x;
        }

        return {
            ...keyframe,
            lcp:
                lKeyframe != null
                    ? { ...keyframe.lcp, tick: clamp(keyframe.lcp.tick, lKeyframe.target.tick, keyframe.target.tick) }
                    : keyframe.target,
            rcp:
                rKeyframe != null
                    ? { ...keyframe.rcp, tick: clamp(keyframe.rcp.tick, keyframe.target.tick, rKeyframe.target.tick) }
                    : keyframe.target,
        };
    }

    function trackControlPoint(e: PointerEvent, keyframeId: string, type: "target" | "lcp" | "rcp") {
        e.preventDefault(); // stop touch default action
        e.stopPropagation();

        if (!selectedIds.includes(keyframeId)) {
            if (e.ctrlKey) onSelect([...selectedIds, keyframeId]);
            else onSelect([keyframeId]);
        }

        const initialData = new Map(selectedIds.map((id) => [id, value.keyframes.find((k) => k.keyframeId == id)]));
        const initialX = e.clientX;
        const initialY = e.clientY;

        trackPointer(e, (e) => {
            if (contentRect == null) return;

            const dx = e.clientX - initialX;
            const dy = e.clientY - initialY;
            const dt = (dx * (viewport.timeRange[1] - viewport.timeRange[0])) / contentRect.width;
            const dv = (dy * (viewport.valueRange[0] - viewport.valueRange[1])) / contentRect.height;

            onValueChange((animator) => ({
                ...animator,
                keyframes: animator.keyframes
                    .map((k) => {
                        const isTarget = initialData.has(k.keyframeId);
                        k = initialData.get(k.keyframeId) ?? k;

                        return {
                            ...k,
                            target: snapPoint({
                                tick: isTarget && type == "target" ? k.target.tick + dt : k.target.tick,
                                value: isTarget && type == "target" ? k.target.value + dv : k.target.value,
                            }),
                            lcp: snapPoint({
                                tick: isTarget && (type == "lcp" || type == "target") ? k.lcp.tick + dt : k.lcp.tick,
                                value: isTarget && (type == "lcp" || type == "target") ? k.lcp.value + dv : k.lcp.value,
                            }),
                            rcp: snapPoint({
                                tick: isTarget && (type == "rcp" || type == "target") ? k.rcp.tick + dt : k.rcp.tick,
                                value: isTarget && (type == "rcp" || type == "target") ? k.rcp.value + dv : k.rcp.value,
                            }),
                        } satisfies animation.Keyframe;
                    })
                    .sort((a, b) => a.target.tick - b.target.tick)
                    .map(readjustKeyframes),
            }));
        });
    }

    function handleEditor(e: PointerEvent) {
        e.preventDefault();

        if (e.buttons & 0b100) {
            const initialViewport = viewport;
            const initialX = e.clientX;
            const initialY = e.clientY;

            trackPointer(e, (e) => {
                if (contentRect == null) return;

                const dx = e.clientX - initialX;
                const dy = e.clientY - initialY;
                const dt = (dx * (viewport.timeRange[1] - viewport.timeRange[0])) / contentRect.width;
                const dv = (dy * (viewport.valueRange[0] - viewport.valueRange[1])) / contentRect.height;

                onViewportChange((viewport) => ({
                    ...viewport,
                    timeRange: [initialViewport.timeRange[0] - dt, initialViewport.timeRange[1] - dt],
                    valueRange: [initialViewport.valueRange[0] - dv, initialViewport.valueRange[1] - dv],
                }));
            });

            return;
        }

        if (e.buttons & 0b001) {
            const rect = contentRect;
            if (rect == null) return;

            function pointerToPoint(e: PointerEvent): animation.Point {
                const timeWindow = viewport.timeRange[1] - viewport.timeRange[0];
                const valueWindow = viewport.valueRange[1] - viewport.valueRange[0];

                return {
                    tick: ((e.clientX - rect!.x) * timeWindow) / rect!.width + viewport.timeRange[0],
                    value: ((rect!.height - e.clientY - rect!.y) * valueWindow) / rect!.height + viewport.valueRange[0],
                };
            }

            const start = pointerToPoint(e);
            selecting = [start, start];

            trackPointer(
                e,
                (e) => (selecting = [start, pointerToPoint(e)]),
                (e) => {
                    const end = pointerToPoint(e);
                    selecting = null;

                    const min: animation.Point = {
                        tick: Math.min(start.tick, end.tick),
                        value: Math.min(start.value, end.value),
                    };

                    const max: animation.Point = {
                        tick: Math.max(start.tick, end.tick),
                        value: Math.max(start.value, end.value),
                    };

                    onSelect(
                        value.keyframes
                            .filter(
                                (k) =>
                                    k.target.tick >= min.tick &&
                                    k.target.tick <= max.tick &&
                                    k.target.value >= min.value &&
                                    k.target.value <= max.value,
                            )
                            .map((k) => k.keyframeId),
                    );
                },
            );

            return;
        }

        if (e.buttons & 0b010) {
            e.preventDefault();
            if (contentRect == null) return;

            const timeWindow = viewport.timeRange[1] - viewport.timeRange[0];
            const valueWindow = viewport.valueRange[1] - viewport.valueRange[0];
            const y = contentRect.height - e.clientY;
            const keyframeId = crypto.randomUUID();
            const target: animation.Point = {
                tick: ((e.clientX - contentRect.x) * timeWindow) / contentRect.width + viewport.timeRange[0],
                value: ((y - contentRect.y) * valueWindow) / contentRect.height + viewport.valueRange[0],
            };

            onValueChange((animator) => ({
                ...animator,
                keyframes: [...animator.keyframes, { keyframeId, target, lcp: target, rcp: target }]
                    .sort((a, b) => a.target.tick - b.target.tick)
                    .map(readjustKeyframes),
            }));

            onSelect([keyframeId]);
            return;
        }
    }

    function handleWheel(e: WheelEvent) {
        if (contentRect == null) return;
        e.preventDefault();

        const timeWindow = viewport.timeRange[1] - viewport.timeRange[0];
        const valueWindow = viewport.valueRange[1] - viewport.valueRange[0];

        // dm: delta multiplier
        const [dmt, dmv] = {
            [WheelEvent.DOM_DELTA_PIXEL]: [timeWindow / contentRect.width, valueWindow / contentRect.height],
            [WheelEvent.DOM_DELTA_LINE]: [timeWindow / 8, valueWindow / 8],
            [WheelEvent.DOM_DELTA_PAGE]: [timeWindow, valueWindow],
        }[e.deltaMode] as [number, number];

        if (e.ctrlKey) {
            // s: scale
            const scale = 1 + e.deltaY / 1000;

            if (e.shiftKey) {
                // c: centroid
                const ct = ((e.clientX - contentRect.x) * timeWindow) / contentRect.width + viewport.timeRange[0];

                onViewportChange((viewport) => ({
                    ...viewport,
                    timeRange: [
                        (viewport.timeRange[0] - ct) * scale + ct, //
                        (viewport.timeRange[1] - ct) * scale + ct,
                    ],
                }));
            } else {
                const y = contentRect.height - e.clientY;
                const cv = ((y - contentRect.y) * valueWindow) / contentRect.height + viewport.valueRange[0];

                onViewportChange((viewport) => ({
                    ...viewport,
                    valueRange: [
                        (viewport.valueRange[0] - cv) * scale + cv,
                        (viewport.valueRange[1] - cv) * scale + cv,
                    ],
                }));
            }
        } else {
            const dt = e.shiftKey ? dmt * e.deltaY : dmt * e.deltaX;
            const dv = e.shiftKey ? 0 : dmv * e.deltaY;

            onViewportChange((viewport) => ({
                ...viewport,
                timeRange: [viewport.timeRange[0] + dt, viewport.timeRange[1] + dt],
                valueRange: [viewport.valueRange[0] - dv, viewport.valueRange[1] - dv],
            }));
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- There is no suitable ARIA role for graph editor -->
<svg
    class="animator-editor"
    bind:contentRect
    onpointerdown={handleEditor}
    onwheel={handleWheel}
    oncontextmenu={(e) => e.preventDefault()}
>
    <defs>
        <g id="keyframe">
            <path
                d={[
                    `M 0,-${theme.animatorEditor.handleSize / 2}`,
                    `L ${theme.animatorEditor.handleSize / 2},0`,
                    `L 0,${theme.animatorEditor.handleSize / 2}`,
                    `L ${-theme.animatorEditor.handleSize / 2},0`,
                    "Z",
                ].join(" ")}
            />
        </g>
        <g id="control-point">
            <circle cx={0} cy={0} r={theme.animatorEditor.handleSize * 0.4} />
        </g>
        <g id="lcp">
            <path
                d={[
                    `M 0,-${theme.animatorEditor.altHandleSize / 2}`,
                    `A 1,1,90,0,0,0,${theme.animatorEditor.altHandleSize / 2}`,
                    "Z",
                ].join(" ")}
            />
        </g>
        <g id="rcp">
            <path
                d={[
                    `M0,-${theme.animatorEditor.altHandleSize / 2}`,
                    `A 1,1,90,0,1,0,${theme.animatorEditor.altHandleSize / 2}`,
                    `Z`,
                ].join(" ")}
            />
        </g>
    </defs>
    {#if contentRect != null}
        <path d={generatePath(contentRect, false)} stroke={color} fill="none" stroke-width={1} />
        <path d={generatePath(contentRect, true)} stroke="none" fill={color} opacity={0.1} />
        {#if selectedBounds != null && selectedIds.length > 1}
            <path
                class="selected-box"
                d={[
                    "M" + pointToPx(selectedBounds[0], contentRect).map((v, i) => v + (i == 0 ? -16 : 16)),
                    "H" + (pointToPx(selectedBounds[1], contentRect)[0] + 16),
                    "V" + (pointToPx(selectedBounds[1], contentRect)[1] - 16),
                    "H" + (pointToPx(selectedBounds[0], contentRect)[0] - 16),
                    "Z",
                ].join(" ")}
                stroke-width={1}
            />
        {/if}
        {#each visibleKeyframes as keyframe (keyframe.keyframeId)}
            <g class:selected={selectedIds.includes(keyframe.keyframeId)}>
                <path
                    class="keyframe-line"
                    d="M{pointToPx(keyframe.target, contentRect)[0]},0 V{contentRect.height}"
                    stroke={color}
                />
                {#if value.keyframes[0].keyframeId == keyframe.keyframeId}
                    <path
                        class="control-point-line"
                        d={[
                            "M" + pointToPx(keyframe.target, contentRect),
                            "L" + pointToPx(keyframe.rcp, contentRect),
                        ].join(" ")}
                    />
                {:else if value.keyframes[value.keyframes.length - 1].keyframeId == keyframe.keyframeId}
                    <path
                        class="control-point-line"
                        d={[
                            "M" + pointToPx(keyframe.lcp, contentRect),
                            "L" + pointToPx(keyframe.target, contentRect),
                        ].join(" ")}
                    />
                {:else}
                    <path
                        class="control-point-line"
                        d={[
                            "M" + pointToPx(keyframe.lcp, contentRect),
                            "L" + pointToPx(keyframe.target, contentRect),
                            "L" + pointToPx(keyframe.rcp, contentRect),
                        ].join(" ")}
                    />
                {/if}
                {#if keyframe.keyframeId != value.keyframes[0].keyframeId}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <!-- No ARIA role suitable for handles -->
                    <use
                        class="control-point"
                        xlink:href={useAltHandle(keyframe.target, keyframe.lcp, contentRect)
                            ? "#lcp"
                            : "#control-point"}
                        transform="translate({pointToPx(keyframe.lcp, contentRect)})"
                        onpointerdown={(e) => trackControlPoint(e, keyframe.keyframeId, "lcp")}
                    />
                {/if}
                {#if keyframe.keyframeId != value.keyframes[value.keyframes.length - 1].keyframeId}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <!-- No ARIA role suitable for handles -->
                    <use
                        class="control-point"
                        xlink:href={useAltHandle(keyframe.target, keyframe.rcp, contentRect)
                            ? "#rcp"
                            : "#control-point"}
                        transform="translate({pointToPx(keyframe.rcp, contentRect)})"
                        onpointerdown={(e) => trackControlPoint(e, keyframe.keyframeId, "rcp")}
                    />
                {/if}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <!-- No ARIA role suitable for handles -->
                <use
                    class="control-point"
                    xlink:href="#keyframe"
                    transform="translate({pointToPx(keyframe.target, contentRect)})"
                    onpointerdown={(e) => trackControlPoint(e, keyframe.keyframeId, "target")}
                />
            </g>
        {/each}
        {#if selecting != null}
            <path
                class="select-box"
                d={[
                    "M" + pointToPx(selecting[0], contentRect),
                    "H" + pointToPx(selecting[1], contentRect)[0],
                    "V" + pointToPx(selecting[1], contentRect)[1],
                    "H" + pointToPx(selecting[0], contentRect)[0],
                    "Z",
                ].join(" ")}
                stroke-width={1}
            />
        {/if}
    {/if}
</svg>

<style>
    .animator-editor {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: none;
        overscroll-behavior: contain;

        > defs {
            > #keyframe > path,
            > #control-point > circle,
            > #lcp > path,
            > #rcp > path {
                fill: inherit;
                stroke: inherit;
            }
        }

        > g {
            stroke-width: 1;
            fill: none;
            stroke: none;

            .control-point {
                fill: #ffffff;
                stroke: #7f7f7f;

                &:hover {
                    fill: #efefef;
                    stroke: #000000;
                }

                &:active {
                    fill: #e7e7e7;
                    stroke: #000000;
                }
            }

            .control-point-line {
                fill: none;
                stroke: #000000;
                opacity: 0.25;
            }

            .keyframe-line {
                stroke-dasharray: 8 4;
                opacity: 0.25;
            }

            &.selected {
                .control-point {
                    fill: #dfefff;
                    stroke: #007fff;

                    &:hover {
                        fill: #afdfff;
                    }

                    &:active {
                        fill: #7fbfef;
                    }
                }

                .control-point-line {
                    stroke: #007fff;
                    stroke-width: 2;
                    opacity: 1;
                }

                .keyframe-line {
                    stroke-dasharray: unset;
                    opacity: 0.5;
                }
            }
        }

        > .select-box {
            fill: #007fff1f;
            stroke: #007fff;
        }

        > .selected-box {
            fill: #007fff07;
            stroke: #007fff;
            stroke-dasharray: 8 4;
        }
    }
</style>
