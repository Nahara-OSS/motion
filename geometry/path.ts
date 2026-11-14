import type { Vec2 } from "./common.ts";
import * as bezier from "./bezier.ts";

/**
 * Path
 *
 * A path really is just a bunch of line segments connected to each other. Curves can be approximated with line segments
 * by dividing them into tiny little lines.
 *
 * Path can be created by any of the following ways:
 *
 * - Manually build path by hand
 * - Draw path with {@link penCommandsToPath}
 *
 * Some operations can be done on path, such as:
 *
 * - Sampling a point on the path: {@link find}
 * - Slicing the path: {@link slice}
 */
export interface Path {
    readonly length: number;
    readonly segments: readonly SegmentInfo[];
}
export interface SegmentInfo {
    readonly offset: number;
    readonly length: number;
    readonly start: Vec2;
    readonly end: Vec2;
}

/**
 * Slice the path
 *
 * @param path Path to slice
 * @param start Start offset on the path
 * @param end End offset on the path
 */
export function slice(path: Path, start: number = 0, end: number = path.length): Path {
    if (start < 0) start = 0;
    if (end > path.length) end = path.length;
    if (start >= end) return { length: 0, segments: [] };

    const findStartResult = find(path, start);
    const findEndResult = find(path, end);

    if (findStartResult.index == findEndResult.index) {
        return {
            length: end - start,
            segments: [
                {
                    offset: 0,
                    length: end - start,
                    start: findStartResult.point,
                    end: findEndResult.point,
                },
            ],
        };
    } else {
        return {
            length: end - start,
            segments: [
                {
                    offset: 0,
                    length: findStartResult.segment.length - findStartResult.segmentOffset,
                    start: findStartResult.point,
                    end: findStartResult.segment.end,
                },
                ...path.segments
                    .slice(findStartResult.index + 1, findEndResult.index)
                    .map((info) => ({ ...info, offset: info.offset - start })),
                {
                    offset: findEndResult.segment.offset - start,
                    length: findEndResult.segmentOffset,
                    start: findEndResult.segment.start,
                    end: findEndResult.point,
                },
            ],
        };
    }
}

/**
 * Find a point on the path
 *
 * @param path Path
 * @param pathOffset Offset in path
 * @returns Find result
 */
export function find(path: Path, pathOffset: number): FindResult {
    const first = path.segments[0];
    const last = path.segments[path.segments.length - 1];

    if (path.segments.length == 0) throw new Error("Path have no segments");
    if (pathOffset < 0) pathOffset = 0;
    if (pathOffset > path.length) pathOffset = path.length;

    if (pathOffset == 0) {
        return {
            index: 0,
            point: first.start,
            segment: first,
            segmentOffset: 0,
            segmentProgress: 0,
        };
    }

    if (pathOffset == path.length) {
        return {
            index: path.segments.length - 1,
            point: last.end,
            segment: last,
            segmentOffset: last.length,
            segmentProgress: 1,
        };
    }

    let start = 0;
    let end = path.segments.length - 1;

    while (start <= end) {
        const mid = (start + end) >> 1;
        const segment = path.segments[mid];
        const pathStart = segment.offset;
        const pathEnd = segment.offset + segment.length;
        if (pathStart > pathOffset) end = mid - 1;
        else if (pathEnd < pathOffset) start = mid + 1;
        else {
            const segmentOffset = pathOffset - pathStart;
            const mix = segmentOffset / segment.length;
            const invMix = 1 - mix;

            return {
                index: mid,
                point: [
                    segment.start[0] * invMix + segment.end[0] * mix,
                    segment.start[1] * invMix + segment.end[1] * mix,
                ],
                segment,
                segmentOffset: pathOffset - pathStart,
                segmentProgress: mix,
            };
        }
    }

    throw new Error(`BUG! Unable to binary search offset ${pathOffset} in the path segments of length ${path.length}`);
}

export interface FindResult {
    readonly index: number;
    readonly point: Vec2;
    readonly segment: SegmentInfo;
    readonly segmentOffset: number;
    readonly segmentProgress: number;
}

/**
 * Calculate the bounding box of a path
 *
 * @param path Path
 * @returns Bounds
 */
export function boundsOf(path: Path): Bounds {
    if (path.segments.length == 0) throw new Error("Path have no segments");

    let left = Math.min(path.segments[0].start[0], path.segments[0].end[0]);
    let right = Math.max(path.segments[0].start[0], path.segments[0].end[0]);
    let top = Math.min(path.segments[0].start[1], path.segments[0].end[1]);
    let bottom = Math.max(path.segments[0].start[1], path.segments[0].end[1]);

    for (let i = 1; i < path.segments.length; i++) {
        const { start, end } = path.segments[i];
        left = Math.min(left, start[0], end[0]);
        right = Math.max(right, start[0], end[0]);
        top = Math.min(top, start[1], end[1]);
        bottom = Math.max(bottom, start[1], end[1]);
    }

    return { left, right, top, bottom };
}

export interface Bounds {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
}

/**
 * Convert pen commands to path generator
 *
 * @param commands Pen commands
 * @param startingPosition Start position of the pen
 * @param bezierTolerance Tolerance for adaptive sampling bezier curves
 * @returns Path generator
 */
export function* penCommandsToPath(
    commands: Iterable<PenCommand>,
    startingPosition: Vec2 = [0, 0],
    bezierTolerance?: number,
): Generator<Path, void, void> {
    let currentPosition = startingPosition;
    let currentPath: { length: number; segments: SegmentInfo[] } = { length: 0, segments: [] };

    function lineTo(target: Vec2) {
        const dx = target[0] - currentPosition[0];
        const dy = target[1] - currentPosition[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        currentPath.segments.push({
            offset: currentPath.length,
            length,
            start: currentPosition,
            end: target,
        });
        currentPath.length += length;
        currentPosition = target;
    }

    for (const command of commands) {
        switch (command.type) {
            case "move": {
                if (currentPath.segments.length > 0) {
                    yield currentPath;
                    currentPath = { length: 0, segments: [] };
                }

                startingPosition = command.target;
                currentPosition = command.target;
                break;
            }

            case "line": {
                lineTo(command.target);
                break;
            }

            case "quadratic": {
                const p0 = currentPosition;
                const p1 = command.cp;
                const p2 = command.target;
                for (const target of bezier.adaptiveQuadratic2D(p0, p1, p2, bezierTolerance)) lineTo(target);
                break;
            }

            case "cubic": {
                const p0 = currentPosition;
                const p1 = command.cp1;
                const p2 = command.cp2;
                const p3 = command.target;
                for (const target of bezier.adaptiveCubic2D(p0, p1, p2, p3, bezierTolerance)) lineTo(target);
                break;
            }

            case "close": {
                const dx = startingPosition[0] - currentPosition[0];
                const dy = startingPosition[1] - currentPosition[1];
                const length = Math.sqrt(dx * dx + dy * dy);
                currentPath.segments.push({
                    offset: currentPath.length,
                    length,
                    start: currentPosition,
                    end: startingPosition,
                });
                currentPath.length += length;
                currentPosition = startingPosition;
                break;
            }
        }
    }

    if (currentPath.segments.length > 0) {
        yield currentPath;
    }
}

export type PenCommand = {
    [Type in keyof PenCommandMap]: {
        readonly type: Type;
    } & PenCommandMap[Type];
}[keyof PenCommandMap];

export interface PenCommandMap {
    move: {
        readonly target: Vec2;
    };

    line: {
        readonly target: Vec2;
    };

    quadratic: {
        readonly cp: Vec2;
        readonly target: Vec2;
    };

    cubic: {
        readonly cp1: Vec2;
        readonly cp2: Vec2;
        readonly target: Vec2;
    };

    // deno-lint-ignore ban-types
    close: {};
}
