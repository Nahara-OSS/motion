export interface HistoryStack<S> {
    readonly current: HistoryEntry<S>;
    readonly undoStack: readonly HistoryEntry<S>[];
    readonly redoStack: readonly HistoryEntry<S>[];
}

export interface HistoryEntry<S> {
    readonly label: string;
    readonly state: S;
}

export const HistoryStack: {
    /**
     * Create new history stack
     *
     * @param label Initial entry label
     * @param state Initial state
     */
    create<S>(label: string, state: S): HistoryStack<S>;

    /**
     * Push new edit to history stack
     *
     * @param stack History stack
     * @param label Label for next history entry
     * @param updater Update function
     */
    push<S>(stack: HistoryStack<S>, label: string, updater: (state: S) => S): HistoryStack<S>;

    /**
     * Push new edit to history stack
     *
     * @param stack History stack
     * @param label Label for next history entry
     * @param updater Update async function
     */
    pushAsync<S>(
        stack: HistoryStack<S>,
        label: string,
        updater: (state: S) => PromiseLike<S>,
    ): Promise<HistoryStack<S>>;

    /**
     * Undo history
     *
     * @param stack History stack
     * @param count Number of undos
     */
    undo<S>(stack: HistoryStack<S>, count: number): HistoryStack<S>;

    /**
     * Redo history
     *
     * @param stack History stack
     * @param count Number of redos
     */
    redo<S>(stack: HistoryStack<S>, count: number): HistoryStack<S>;
} = {
    create: (label, state) => ({
        current: { label, state },
        undoStack: [],
        redoStack: [],
    }),

    push: (stack, label, updater) => ({
        ...stack,
        current: { label, state: updater(stack.current.state) },
        undoStack: [...stack.undoStack, stack.current],
        redoStack: [],
    }),

    pushAsync: async (stack, label, updater) => ({
        ...stack,
        current: { label, state: await updater(stack.current.state) },
        undoStack: [...stack.undoStack, stack.current],
        redoStack: [],
    }),

    undo: (stack, count) => {
        if (count <= 0) return stack;
        if (count > stack.undoStack.length) count = stack.undoStack.length;
        const movingEntries = stack.undoStack.slice(stack.undoStack.length - count);
        const next = movingEntries[0];
        return {
            ...stack,
            current: next,
            undoStack: stack.undoStack.slice(0, stack.undoStack.length - count),
            redoStack: [
                ...stack.redoStack,
                stack.current,
                ...movingEntries.slice(1).reverse(),
            ],
        };
    },

    redo: (stack, count) => {
        if (count <= 0) return stack;
        if (count > stack.redoStack.length) count = stack.redoStack.length;
        const movingEntries = stack.redoStack.slice(stack.redoStack.length - count);
        const next = movingEntries[0];
        return {
            ...stack,
            current: next,
            redoStack: stack.redoStack.slice(0, stack.redoStack.length - count),
            undoStack: [
                ...stack.undoStack,
                stack.current,
                ...movingEntries.slice(1).reverse(),
            ],
        };
    },
};
