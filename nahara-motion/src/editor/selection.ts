import { Keyframe } from "../scene/animation.js";
import { SceneObjectInfo } from "../scene/object.js";

export interface IObjectSelection<T> {
    readonly multiple: ArrayLike<T> | Iterable<T>;
    readonly primary?: T;

    addToSelection(target: T): void;
    removeFromSelection(target: T): void;
    clear(): void;
}

/**
 * Represent a selection on timeline. This will be used for quickly adding new object with selected time range, or used
 * as input for some commands.
 *
 * If both start time and end time are exactly the same, the selection will be a single point in timeline axis, which
 * will be displayed as secondary seekbar instead of range.
 */
export interface ITimelineSelection {
    readonly startTime: number;
    readonly endTime: number;

    select(from: number, to: number): void;
}

export interface ISelectionsManager {
    readonly objects: IObjectSelection<SceneObjectInfo>;
    readonly keyframes: IObjectSelection<Keyframe<any>>;
    readonly timeline: ITimelineSelection;
}