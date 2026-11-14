import type { Vec2 } from "./common.ts";

export function sampleQuadratic(
    p0: number,
    p1: number,
    p2: number,
    t: number,
): number {
    const i = 1 - t;
    const p01 = p0 * i + p1 * t;
    const p12 = p1 * i + p2 * t;
    return p01 * i + p12 * t;
}

export function sampleCubic(
    p0: number,
    p1: number,
    p2: number,
    p3: number,
    t: number,
): number {
    const i = 1 - t;
    const p01 = p0 * i + p1 * t;
    const p12 = p1 * i + p2 * t;
    const p23 = p2 * i + p3 * t;
    const p012 = p01 * i + p12 * t;
    const p123 = p12 * i + p23 * t;
    return p012 * i + p123 * t;
}

/**
 * Promote quadratic bezier curve to cubic bezier curve
 *
 * @param qp0 Start point
 * @param qp1 Control point
 * @param qp2 End point
 * @returns Start, control 1, control 2 and end points of cubic bezier
 */
export function quadraticToCubic(
    qp0: number,
    qp1: number,
    qp2: number,
): [cp0: number, cp1: number, cp2: number, cp3: number] {
    return [
        qp0,
        qp0 + (qp1 - qp0) * 2 / 3,
        qp2 + (qp1 - qp2) * 2 / 3,
        qp2,
    ];
}

/**
 * Adaptively sample the 2D quadratic bezier curve
 *
 * Worth noting that this function does not produce the start point, but it does produce end point.
 *
 * @param p0 Start point
 * @param p1 Control point
 * @param p2 End point
 * @param tolerance Tolerance
 * @returns Point generator
 */
export function adaptiveQuadratic2D(
    p0: Vec2,
    p1: Vec2,
    p2: Vec2,
    tolerance?: number,
): Generator<Vec2, void, void> {
    const x = quadraticToCubic(p0[0], p1[0], p2[0]);
    const y = quadraticToCubic(p0[1], p1[1], p2[1]);
    return adaptiveCubic2D([x[0], y[0]], [x[1], y[1]], [x[2], y[2]], [x[3], y[3]], tolerance);
}

/**
 * Adaptively sample the 2D cubic bezier curve
 *
 * Worth noting that this function does not produce the start point, but it does produce end point.
 *
 * Based on https://agg.sourceforge.net/antigrain.com/research/adaptive_bezier/
 *
 * @param p0 Start point
 * @param p1 Control point 1
 * @param p2 Control point 2
 * @param p3 End point
 * @param tolerance Tolerance
 * @returns Point generator
 */
export function* adaptiveCubic2D(
    p0: Vec2,
    p1: Vec2,
    p2: Vec2,
    p3: Vec2,
    tolerance: number = 0.50,
): Generator<Vec2, void, void> {
    const dx = p3[0] - p0[0], dy = p3[1] - p0[1];
    const d1 = Math.abs((p1[0] - p3[0]) * dy - (p1[1] - p3[1]) * dx);
    const d2 = Math.abs((p2[0] - p3[0]) * dy - (p2[1] - p3[1]) * dx);

    if ((d1 + d2) * (d1 + d2) <= tolerance * tolerance * (dx * dx + dy * dy)) {
        yield p3;
        return;
    }

    const p01 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2] satisfies Vec2;
    const p12 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2] satisfies Vec2;
    const p23 = [(p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2] satisfies Vec2;
    const p012 = [(p01[0] + p12[0]) / 2, (p01[1] + p12[1]) / 2] satisfies Vec2;
    const p123 = [(p12[0] + p23[0]) / 2, (p12[1] + p23[1]) / 2] satisfies Vec2;
    const p0123 = [(p012[0] + p123[0]) / 2, (p012[1] + p123[1]) / 2] satisfies Vec2;

    for (const point of adaptiveCubic2D(p0, p01, p012, p0123, tolerance)) yield point;
    for (const point of adaptiveCubic2D(p0123, p123, p23, p3, tolerance)) yield point;
}
