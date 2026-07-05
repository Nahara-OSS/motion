export interface Point {
    readonly x: number;
    readonly y: number;
}

export type PathPart =
    | { type: "move-to" } & Move
    | { type: "line-to" } & Move
    | { type: "cubic-bezier" } & CubicBezier
    | { type: "close-path" };

export interface Move {
    readonly to: Point;
}

export interface CubicBezier {
    readonly cp1: Point;
    readonly cp2: Point;
    readonly to: Point;
}

/**
 * Sample the path into flattened path.
 *
 * @param path Path
 * @param tStart Path start fraction
 * @param tEnd Path end fraction
 * @param scale Scaling
 * @returns A list of flattened path
 */
export function samplePath(
    path: PathPart[],
    tStart: number = 0,
    tEnd: number = 1,
): Point[][] {
    const allPaths: [d: number, Point][][] = [];
    let current: [d: number, Point][] | null = null;
    let d = 0;

    for (const part of path) {
        if (part.type == "move-to") {
            if (current != null) allPaths.push(current);
            current = [[0, part.to]];
            d = 0;
        } else if (current == null) {
            throw new Error(`A path must starts with "move-to" (found "${part.type}" instead)`);
        }

        let from = current[current.length - 1][1];

        switch (part.type) {
            case "line-to": {
                const { to } = part;
                const length = Math.sqrt((to.x - from.x) * (to.x - from.x) + (to.y - from.y) * (to.y - from.y));
                d += length;
                if (length != 0) current.push([d, to]);
                break;
            }

            case "cubic-bezier": {
                const { cp1, cp2, to: cp3 } = part;
                const minX = Math.min(from.x, cp1.x, cp2.x, cp3.x);
                const minY = Math.min(from.y, cp1.y, cp2.y, cp3.y);
                const maxX = Math.max(from.x, cp1.x, cp2.x, cp3.x);
                const maxY = Math.max(from.y, cp1.y, cp2.y, cp3.y);
                const samples = Math.round(Math.max(maxX - minX, maxY - minY) / 2);

                for (let i = 1; i <= samples; i++) {
                    const t = i / samples;
                    const cp01 = lerp(from, cp1, t);
                    const cp12 = lerp(cp1, cp2, t);
                    const cp23 = lerp(cp2, cp3, t);
                    const cp012 = lerp(cp01, cp12, t);
                    const cp123 = lerp(cp12, cp23, t);
                    const to = lerp(cp012, cp123, t);
                    const length = Math.sqrt((to.x - from.x) * (to.x - from.x) + (to.y - from.y) * (to.y - from.y));
                    if (length == 0) continue;
                    d += length;
                    if (length != 0) current.push([d, to]);
                    from = to;
                }

                break;
            }

            case "close-path": {
                const to = current[0][1];
                const length = Math.sqrt((to.x - from.x) * (to.x - from.x) + (to.y - from.y) * (to.y - from.y));
                d += length;
                if (length != 0) current.push([d, to]);
                allPaths.push(current);
                current = null;
                d = 0;
                break;
            }

            default:
                break;
        }
    }

    if (current != null) {
        allPaths.push(current);
    }

    if (tStart == 0.0 && tEnd == 1.0) {
        return allPaths.map((path) => path.map(([_, point]) => point));
    }

    return allPaths.map((path) => {
        const length = path[path.length - 1][0];
        const dStart = tStart * length;
        const dEnd = tEnd * length;
        let startIndex: number, endIndex: number;

        for (startIndex = 1; startIndex < path.length; startIndex++) {
            const dPrev = path[startIndex - 1][0];
            const dNext = path[startIndex][0];
            if (dPrev <= dStart && dStart <= dNext) break;
        }

        for (endIndex = path.length - 2; endIndex >= 0; endIndex--) {
            const dPrev = path[endIndex][0];
            const dNext = path[endIndex + 1][0];
            if (dPrev <= dEnd && dEnd <= dNext) break;
        }

        return [
            lerp(
                path[startIndex - 1][1],
                path[startIndex][1],
                calculateFraction(path[startIndex - 1][0], path[startIndex][0], dStart),
            ),
            ...path.slice(startIndex, endIndex + 1).map((v) => v[1]),
            lerp(
                path[endIndex][1],
                path[endIndex + 1][1],
                calculateFraction(path[endIndex][0], path[endIndex + 1][0], dEnd),
            ),
        ];
    });
}

function lerp(a: Point, b: Point, frac: number): Point {
    const invFrac = 1 - frac;

    return {
        x: a.x * invFrac + b.x * frac,
        y: a.y * invFrac + b.y * frac,
    };
}

function calculateFraction(a: number, b: number, v: number): number {
    return (v - a) / (b - a);
}
