import type { ComponentChildren, ComponentType, TargetedPointerEvent, TargetedWheelEvent } from "preact";
import { cx } from "./utils.ts";
import { useMemo, useRef } from "preact/hooks";
import "./timeline.css";

export const Timeline: ComponentType<{
    time: number;
    viewStart: number;
    viewEnd: number;
    barWidth?: string;
    actions?: ComponentChildren;
    onTimeChange: (time: number) => void;
    onViewChange: (start: number, end: number) => void;
}> = ({
    time,
    viewStart: start,
    viewEnd: end,
    barWidth = "20em",
    actions,
    onTimeChange,
    onViewChange,
    children,
}) => {
    const timingBarRef = useRef<HTMLDivElement>(null);
    const range = end - start;
    const major = range > 120000 ? 60000 : range > 25000 ? 5000 : 1000;
    const minor = range > 120000 ? 15000 : range > 25000 ? 1000 : 100;
    const timingMarkers = useMemo(() => generateTimingMarkers(start, end, major, minor), [start, end, major, minor]);

    function onSeekheadPointerDown(e: TargetedPointerEvent<HTMLDivElement>) {
        if (timingBarRef.current == null) return;
        const initialX = e.clientX;
        const target = e.currentTarget;
        const { width } = timingBarRef.current.getBoundingClientRect();

        function onMove(e: PointerEvent) {
            const x = e.clientX;
            const dx = x - initialX;
            const dt = dx * (end - start) / width;
            onTimeChange(Math.max(time + dt, 0));
        }

        function onUp() {
            target.removeEventListener("pointermove", onMove);
            target.removeEventListener("pointerup", onUp);
        }

        e.preventDefault();
        e.stopPropagation();
        target.setPointerCapture(e.pointerId);
        target.addEventListener("pointermove", onMove);
        target.addEventListener("pointerup", onUp);
    }

    function onWheel(e: TargetedWheelEvent<HTMLDivElement>) {
        const target = e.currentTarget;
        const { width, left } = target.getBoundingClientRect();
        let dt: number;

        switch (e.deltaMode) {
            case WheelEvent.DOM_DELTA_PIXEL: {
                dt = (e.deltaX != 0 ? e.deltaX : e.deltaY) * (end - start) / width;
                break;
            }

            case WheelEvent.DOM_DELTA_PAGE: {
                dt = (end - start) * (e.deltaX != 0 ? e.deltaX : e.deltaY);
                break;
            }

            default: {
                dt = (end - start) * (e.deltaX != 0 ? e.deltaX : e.deltaY) / 8;
                break;
            }
        }

        if (e.ctrlKey) {
            const centroid = (e.clientX - left) / width;
            onViewChange(start - dt * centroid, end + dt * (1 - centroid));
        } else {
            onViewChange(start + dt, end + dt);
        }

        e.preventDefault();
    }

    return (
        <div
            class={cx("nahara-ui-timeline")}
            style={{
                "--timeline-time": time,
                "--timeline-view-start": start,
                "--timeline-view-end": end,
                "--timeline-bar-width": barWidth,
            }}
        >
            <div class={cx("back-layer")}>
                {start < 0 ? <div class={cx("bound start")}></div> : null}
            </div>
            <header>
                <div class={cx("actions")}>
                    {actions}
                </div>
                <div
                    class={cx("timing-bar")}
                    ref={timingBarRef}
                    onWheel={onWheel}
                >
                    {timingMarkers.map(({ type, time }) => (
                        <div
                            key={time}
                            class={cx("timing-marker", type)}
                            style={{ "--marker-time": time }}
                        />
                    ))}
                    <div
                        class={cx("seekhead-handle")}
                        role="slider"
                        tabIndex={0}
                        onPointerDown={onSeekheadPointerDown}
                    >
                        <div class={cx("content")}>
                            {formatTime(time)}
                        </div>
                    </div>
                </div>
            </header>
            <main>
                <div class={cx("tracks")}>
                    {children}
                </div>
                <div class={cx("space")}>
                    <div class={cx("sidebar")}></div>
                </div>
            </main>
            <div class={cx("front-layer")}>
                <div class={cx("seekhead-line")}></div>
            </div>
        </div>
    );
};

export const TimelineTrack: ComponentType<{
    label: ComponentChildren;
    level: number;
    property?: ComponentChildren;
}> = ({
    label,
    level,
    property,
    children,
}) => {
    return (
        <div class={cx("nahara-ui-timeline-track")} style={{ "--level": level }}>
            <div class={cx("sidebar")}>
                <div class={cx("label")}>
                    {label}
                </div>
                <div class={cx("property")}>
                    {property}
                </div>
            </div>
            <div class={cx("track")}>
                {children}
            </div>
        </div>
    );
};

export const TimeSpan: ComponentType<{
    start: number;
    end: number;
}> = ({
    start,
    end,
}) => {
    return (
        <div
            class={cx("nahara-ui-timespan")}
            role="slider"
            tabIndex={0}
            style={{
                "--timespan-start": start,
                "--timespan-end": end,
            }}
        >
            <div class={cx("container")}>
                <div class={cx("handle", "left")}></div>
                <div class={cx("handle", "right")}></div>
            </div>
        </div>
    );
};

export const Keyframe: ComponentType<{
    time: number;
}> = ({
    time,
}) => {
    return (
        <div
            class={cx("nahara-ui-keyframe")}
            role="slider"
            tabindex={0}
            style={{ "--keyframe-time": time }}
        />
    );
};

/**
 * Visualize easing with ticks
 *
 * Assuming the easing equation is `y = f(t)`, each tick corresponding to the `y` value. The ticks will be placed on the
 * timeline such that at given time, the `y` value equals to tick value.
 *
 * For example, given the following easing function: `f(t) = t * 3`, which starts slow at first, but then quickly speed
 * up towards the end. The easing will be visualized as having fewer ticks at the start and more ticks at the end.
 *
 * Easing ticks should not be used when 2 keyframes have the same values. The easing function passed to the props should
 * be memoized, otherwise it would run the ticks calculation on every render, which can cause lag.
 */
export const EasingTicks: ComponentType<{
    start: number;
    end: number;
    easing: (x: number) => number;
    count?: number;
    samples?: number;
}> = ({
    start,
    end,
    easing,
    count = 7,
    samples = 256,
}) => {
    const ticks = useMemo(() => generateEasingTicks(easing, count, samples), [count, easing, samples]);

    return (
        <div
            class={cx("nahara-ui-easing-ticks")}
            aria-hidden
            style={{
                "--easing-ticks-start": start,
                "--easing-ticks-end": end,
            }}
        >
            {ticks.map((progress, i) => <div key={i} class={cx("tick")} style={{ "--progress": progress }} />)}
        </div>
    );
};

function formatTime(time: number): string {
    const [min, sec, ms] = timeToComponents(time);
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

function timeToComponents(time: number): readonly [min: number, sec: number, ms: number] {
    time = Math.floor(time);
    const ms = time % 1000;
    const sec = Math.floor(time / 1000) % 60;
    const min = Math.floor(time / 60000);
    return [min, sec, ms];
}

function generateTimingMarkers(start: number, end: number, major: number, minor: number): TimingMarker[] {
    const markers: TimingMarker[] = [];
    start = Math.floor((start - minor) / minor) * minor;
    end = Math.ceil((end + minor) / minor) * minor;

    for (let time = start; time <= end; time += minor) {
        const type = (time % major) == 0 ? MarkerType.Major : MarkerType.Minor;
        markers.push({ type, time });
    }

    return markers;
}

interface TimingMarker {
    readonly type: MarkerType;
    readonly time: number;
}

enum MarkerType {
    Major = "major",
    Minor = "minor",
}

function generateEasingTicks(easing: (x: number) => number, count: number, samples: number = 32): number[] {
    const graph = new Array(samples)
        .fill(0)
        .map((_, i) => i / (samples - 1))
        .map((x) => [x, easing(x)] as const)
        .filter(([_, y]) => y >= 0 && y <= 1)
        .sort(([y1], [y2]) => y1 - y2);

    if (graph[0][0] != 0) graph.unshift([0, 0]);
    if (graph[graph.length - 1][0] != 1) graph.push([1, 1]);

    function sampleInvertedGraph(y: number): number {
        let start = 0, end = graph.length - 1;

        while (start <= end) {
            const mid = (start + end) >> 1;
            const val = graph[mid][1];

            if (val < y) start = mid + 1;
            else if (val > y) end = mid - 1;
            else return graph[mid][0];
        }

        const lhs = graph[start - 1];
        const rhs = graph[start];
        const p = (y - lhs[1]) / (rhs[1] - lhs[1]);
        const x = lhs[0] * p + rhs[0] * (1 - p);
        return x;
    }

    return new Array(count)
        .fill(0)
        .map((_, i) => (i + 1) / (count + 1))
        .map(sampleInvertedGraph);
}
