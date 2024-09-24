import { writable } from "svelte/store";
import { app } from "./appglobal";
import type { IObjectContainer } from "@nahara/motion";

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

function nearestSnap(coord: number): number {
    const scene = app.getCurrentScene();
    if (!scene) return coord;

    let nearestPoint = -Infinity;

    function nearestSnapFromContainer(container: IObjectContainer) {
        for (const obj of container) {
            if (Math.abs(coord - obj.timeStart) < Math.abs(coord - nearestPoint)) nearestPoint = obj.timeStart;
            if (Math.abs(coord - obj.timeEnd) < Math.abs(coord - nearestPoint)) nearestPoint = obj.timeEnd;
        }
    }

    nearestSnapFromContainer(scene);
    return Math.abs(coord - nearestPoint) < 100 ? nearestPoint : coord;
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
        if (mode == "nearest-object") return nearestSnap(time);

        if (typeof mode == "object") {
            if (mode.type == "grid") return gridSnap(time, mode.msPerSegment);
            if (mode.type == "bpm") return gridSnap(time, 60000 / mode.bpm / mode.division);
        }

        return time;
    }
}