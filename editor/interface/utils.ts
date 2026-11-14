import { type Inputs, useMemo } from "preact/hooks";

export function cx(...inputs: ClassCx[]): string {
    return inputs.flatMap(cxInternal).join(" ");
}

function cxInternal(input: ClassCx): string[] {
    if (typeof input == "string") return [input];
    if (input instanceof Array) return input.flatMap(cxInternal);
    return Object.entries(input).filter(([_, state]) => state).map(([name]) => name);
}

export type ClassCx =
    | string
    | Record<string, boolean>
    | readonly ClassCx[];

function randomUUID(): ReturnType<Crypto["randomUUID"]> {
    return crypto.randomUUID();
}

/**
 * Hook to produce a random UUID that persists between renders
 *
 * If the input array changed, the UUID will be recalculated.
 */
export function useUUID(inputs: Inputs = []): ReturnType<Crypto["randomUUID"]> {
    return useMemo(randomUUID, inputs);
}

export enum SelectMode {
    Single,
    Multiple,
    Range,
}

export function select<T>(current: readonly T[], next: T, mode: SelectMode): T[] {
    switch (mode) {
        case SelectMode.Single: {
            return [next];
        }

        case SelectMode.Multiple:
        case SelectMode.Range: {
            // TODO: implement range selection
            // need access to array of all items
            const selected = current.includes(next);
            return selected ? current.filter((v) => v != next) : current = [...current, next];
        }
    }
}
