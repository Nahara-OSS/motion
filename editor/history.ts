/**
 * History stack
 *
 * A general purpose history stack for managing edit history.
 *
 * ```
 * let history = HistoryStack.create("Open project", loadedProject);
 * history = HistoryStack.push(history, "Delete all objects", project => ({ ...project, objects: [] }));
 * history = HistoryStack.undo(history, 1);
 * history = HistoryStack.redo(history, 1);
 * ```
 *
 * The history contains 2 stacks: one for undo and another one for redo. When undo or redo, the tail from one stack will
 * be moved to another one. An undo operation is essentially like this basic stack exchange operation:
 *
 * ```
 * redoStack.push(current);
 * current = undoStack.pop();
 * ```
 */
export interface HistoryStack<S> {
    readonly current: HistoryEntry<S>;
    readonly undoStack: readonly HistoryEntry<S>[];
    readonly redoStack: readonly HistoryEntry<S>[];
}

export interface HistoryEntry<S> {
    readonly label: string;
    readonly snapshot: S;
}

export const HistoryStack: {
    /**
     * Create new history stack state
     *
     * @param label Label for initialization entry
     * @param state Initial state
     * @returns History stack state
     */
    readonly create: <S>(label: string, state: S) => HistoryStack<S>;

    /**
     * Create new history stack to push new entry
     *
     * Undo stack will receive the current entry, the current entry will be replaced with new one, and the redo stack
     * will be cleared. If the updater return the provided value as-is (same identity), no history entry will be pushed,
     * unless `force` is set to `true`.
     *
     * @param stack Old history stack
     * @param label Label for next entry
     * @param updater Update function
     * @param force Force pushing new history entry
     * @returns New history stack
     */
    readonly push: <S>(
        stack: HistoryStack<S>,
        label: string,
        updater: (state: S) => S,
        force?: boolean,
    ) => HistoryStack<S>;

    /**
     * Async version of {@link HistoryStack.push}
     *
     * Particularly useful for edit operations that might need to do some async tasks, such as compiling module.
     *
     * @param stack Old history stack
     * @param label Label for next entry
     * @param updater Async update function
     * @param force Force pushing new history entry
     * @returns New history stack
     */
    readonly pushAsync: <S>(
        stack: HistoryStack<S>,
        label: string,
        updater: (state: S) => Promise<S>,
        force?: boolean,
    ) => Promise<HistoryStack<S>>;

    /**
     * Undo the history
     *
     * Throws if the undo count is greater than the number of undo entries; return the old stack if count is less than
     * or equals to 0.
     *
     * @param stack Old history stack
     * @param count Undo count
     * @returns New history stack
     */
    readonly undo: <S>(stack: HistoryStack<S>, count: number) => HistoryStack<S>;

    /**
     * Redo the history
     *
     * Throws if the redo count is greater than the number of redo entries; return the old stack if count is less than
     * or equals to 0.
     *
     * @param stack Old history stack
     * @param count Redo count
     * @returns New histor stack
     */
    readonly redo: <S>(stack: HistoryStack<S>, count: number) => HistoryStack<S>;
} = {
    create: (label, state) => ({
        current: { label, snapshot: state },
        undoStack: [],
        redoStack: [],
    }),

    push: (stack, label, updater, force) => {
        const next = updater(stack.current.snapshot);
        if (stack.current.snapshot === next && !force) return stack;

        return {
            current: { label, snapshot: next },
            undoStack: [...stack.undoStack, stack.current],
            redoStack: [],
        };
    },

    pushAsync: async (stack, label, updater, force) => {
        const next = await updater(stack.current.snapshot);
        if (stack.current.snapshot === next && !force) return stack;

        return {
            current: { label, snapshot: next },
            undoStack: [...stack.undoStack, stack.current],
            redoStack: [],
        };
    },

    undo: (stack, count) => {
        if (count <= 0) return stack;
        if (count > stack.undoStack.length) {
            throw new Error(`Trying to undo ${count} while the stack only have ${stack.undoStack.length} entries`);
        }

        const [undoStack, current, redoStack] = exchangeStack(stack.undoStack, stack.current, stack.redoStack, count);
        return { current, undoStack, redoStack };
    },

    redo: (stack, count) => {
        if (count <= 0) return stack;
        if (count > stack.redoStack.length) {
            throw new Error(`Trying to redo ${count} while the stack only have ${stack.redoStack.length} entries`);
        }

        const [redoStack, current, undoStack] = exchangeStack(stack.redoStack, stack.current, stack.undoStack, count);
        return { current, undoStack, redoStack };
    },
};

function exchangeStack<T>(src: readonly T[], mid: T, dst: readonly T[], count: number): [T[], T, T[]] {
    const moving = src.slice(src.length - count);
    const nextSrc = src.slice(0, src.length - count);
    const nextMid = moving[0];
    const nextDst = [...dst, mid, ...moving.slice(1).reverse()];
    return [nextSrc, nextMid, nextDst];
}
