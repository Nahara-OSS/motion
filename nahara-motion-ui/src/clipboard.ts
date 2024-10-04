import type { Easing } from "@nahara/motion";

export namespace clipboard {
    export type ContextType<T> = { name: string, defaultValue: T };

    export const Easing: ContextType<Easing> = { name: "Easing", defaultValue: "linear" };

    const map = new Map<ContextType<any>, any>();

    export function get<T>(context: ContextType<T>): T | undefined {
        const result = map.get(context);
        return result != null ? structuredClone(result) : undefined;
    }

    export function set<T>(context: ContextType<T>, content: T) {
        map.set(context, structuredClone(content));
    }
}