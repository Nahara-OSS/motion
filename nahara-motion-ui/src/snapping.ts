import { writable } from "svelte/store";

export type TimelineSnappingMode =
    | "free" // Move objects freely
    | "nearest-object" // Snap to nearest object lifespan
    | { type: "bpm", bpm: number, division: number } // Snap to BPM (useful for song visualization/storyboarding)
    | { type: "grid", msPerSegment: number } // Snap to time grid

export type ViewportSnappingMode =
    | "free"
    | "nearest-object" // Snap to nearest object's corner/edge
    | { type: "viewport-grid", segmentX: number, segmentY: number } // Snap to viewport grid
    | { type: "scene-grid", segmentX: number, segmentY: number } // Snap to scene grid

function gridSnap(coord: number, segment: number): number {
    return Math.round(coord / segment) * segment;
}

export namespace snapping {
    let timeline: TimelineSnappingMode = { type: "grid", msPerSegment: 100 };
    let viewport: ViewportSnappingMode = { type: "viewport-grid", segmentX: 1, segmentY: 1 };

    export const timelineStore = writable<TimelineSnappingMode>(timeline);
    export const viewportStore = writable<ViewportSnappingMode>(viewport);

    export function getTimelineSnappingMode() { return timeline; }
    export function setTimelineSnappingMode(mode: TimelineSnappingMode) {
        timeline = mode;
        timelineStore.set(mode);
    }

    export function getViewportSnappingMode() { return viewport; }
    export function setViewportSnappingMode(mode: ViewportSnappingMode) {
        viewport = mode;
        viewportStore.set(mode);
    }

    export function snapTimeline(time: number, mode = timeline): number {
        if (mode == "free") return time;

        if (typeof mode == "object") {
            if (mode.type == "grid") return gridSnap(time, mode.msPerSegment);
        }

        return time;
    }
}