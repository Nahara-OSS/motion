/**
 * Animator.
 *
 * Animator is a collection of keyframes ordered by its target control point's tick value in ascending order. A single
 * animator only animates a single value, and a pair of keyframe forms cubic bezier curve. When sampling the animator,
 * the input time value will be clamped to bounds of the animator (clamped between tick value of first and last
 * keyframes). There must be at least a single keyframe in the animator, otherwise there wouldn't be any keyframes to
 * obtain the value.
 */
export interface Animator {
    /**
     * A list of keyframes ordered by its target tick value in ascending order.
     */
    readonly keyframes: Keyframe[];
}

/**
 * Keyframe in animator.
 *
 * The target control points, right control point of previous keyframe and left control point of next keyframe forms
 * a cubic bezier curve interpolation. The constraints for control points only applies to tick values:
 *
 * - The tick value for left control point must be between last and current target control point's tick;
 * - The tick value for right control point must be between current and next target control point's tick.
 *
 * The constraints are applied to all keyframes to ensure the bezier curve does not reach outside the bounds of keyframe
 * pair along time axis, as well as forcing the progress value to only go up as time goes up (progress value does not
 * decrease as time is increasing).
 */
export interface Keyframe {
    /**
     * The ID of keyframe.
     *
     * Keyframe ID is mainly used by user interface to link the keyframe to UI component.
     */
    readonly keyframeId: string;

    /**
     * Target control point.
     */
    readonly target: Point;

    /**
     * Left control point.
     */
    readonly lcp: Point;

    /**
     * Right control point.
     */
    readonly rcp: Point;
}

export interface Point {
    readonly tick: number;
    readonly value: number;
}

/**
 * Create animator with constant value at any time position.
 *
 * @param value Value
 * @returns Animator with constant value
 */
export function constant(value: number): Animator {
    return {
        keyframes: [
            {
                keyframeId: "default",
                target: { tick: 0, value },
                lcp: { tick: 0, value },
                rcp: { tick: 0, value },
            },
        ],
    };
}

/**
 * Sample animator.
 *
 * @param animator Animator to sample
 * @param tick Tick value
 * @returns Sampled value
 */
export function sampleAnimator(animator: Animator, tick: number): number {
    if (animator.keyframes.length == 0) throw new Error("Animator must have at least 1 keyframe");
    const search = searchInsertIndex(animator.keyframes, tick);
    const prev = animator.keyframes[search] ?? animator.keyframes[0];
    const next = animator.keyframes[search + 1] ?? animator.keyframes[animator.keyframes.length - 1];
    return sampleBezierCurve(tick, prev.target, prev.rcp, next.lcp, next.target);
}

function searchInsertIndex(keyframes: Keyframe[], tick: number): number {
    let s = 0, e = keyframes.length - 1;

    while (e - s > 1) {
        const m = (s + e) >> 1;
        const k = keyframes[m];

        if (tick > k.target.tick) s = m;
        else if (tick < k.target.tick) e = m;
        else return m;
    }

    return s;
}

function sampleBezierCurve(tick: number, cp0: Point, cp1: Point, cp2: Point, cp3: Point): number {
    if (tick <= cp0.tick) return cp0.value;
    if (tick >= cp3.tick) return cp3.value;

    let s = 0, e = 1; // start - end

    while ((e - s) > 1e-6) {
        const m = (s + e) / 2; // midpoint
        const t = bezierCurve(m, cp0.tick, cp1.tick, cp2.tick, cp3.tick);

        if (tick > t) s = m;
        else if (tick < t) e = m;
        else return bezierCurve(m, cp0.value, cp1.value, cp2.value, cp3.value);
    }

    return bezierCurve((s + e) / 2, cp0.value, cp1.value, cp2.value, cp3.value);
}

function bezierCurve(p: number, cp0: number, cp1: number, cp2: number, cp3: number): number {
    const ip = 1 - p; // inverse p
    const cp01 = cp0 * ip + cp1 * p;
    const cp12 = cp1 * ip + cp2 * p;
    const cp23 = cp2 * ip + cp3 * p;
    const cp012 = cp01 * ip + cp12 * p;
    const cp123 = cp12 * ip + cp23 * p;
    return cp012 * ip + cp123 * p;
}

/**
 * Curve modifier.
 *
 * This function applies on a curve to modify the shape of it (eg: `ease-out` curve).
 */
export type CurveModifier = (a: Point, b: Point, c: Point, d: Point) => [a: Point, b: Point, c: Point, d: Point];

/**
 * Point modifier.
 *
 * This function applies on a keyframe to modify the control points of it (eg: smoothing the curve).
 */
export type KeyframeModifier = (target: Point, lcp: Point, rcp: Point) => [target: Point, lcp: Point, rcp: Point];
