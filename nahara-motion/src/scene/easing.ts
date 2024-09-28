import { Vec2 } from "../types.js";

export type PredefinedEasing = "linear" | "hold" | "ease-in" | "ease-out" | "ease-in-out";
export type BezierEasing = { type: "bezier", startControlPoint: Vec2, endControlPoint: Vec2 };
export type Easing = PredefinedEasing | BezierEasing;

export function predefinedEasing(type: PredefinedEasing, x: number) {
    switch (type) {
        case "linear": return x;
        case "hold": return 0;
        case "ease-in": return 1 - Math.cos(x * Math.PI / 2);
        case "ease-out": return Math.sin(x * Math.PI / 2);
        case "ease-in-out": return -(Math.cos(Math.PI * x) - 1) / 2;
        default: return x;
    };
}

function parametricBezier(cp1: number, cp2: number, p: number): number {
    const invP = 1 - p;
    return 3 * invP**2 * p * cp1 + 3 * invP * p**2 * (cp2 + 1) + p**3;
}

export function bezierEasing(type: BezierEasing, x: number) {
    // x => time
    // y => value
    let start = 0, end = 1;

    while ((end - start) > 1e-6) {
        const mid = (start + end) / 2;
        const xr = parametricBezier(type.startControlPoint.x, type.endControlPoint.x, mid);
        if (x > xr) start = mid;
        else if (x < xr) end = mid;
        else return parametricBezier(type.startControlPoint.y, type.endControlPoint.y, mid);
    }

    return parametricBezier(type.startControlPoint.y, type.endControlPoint.y, (start + end) / 2);
}

export function easing(type: Easing, x: number) {
    if (typeof type == "string") return predefinedEasing(type, x);
    if (type.type == "bezier") return bezierEasing(type, x);
    return x;
}