import type { ComponentType } from "preact";
import { useEffect, useState } from "preact/hooks";
import type * as protocol from "../protocol.ts";

export interface CommandHandler {
    check(commandId: string): boolean;
    trigger(command: protocol.CommandTriggerData): void;
}

const commandHandlers = new Set<CommandHandler>();
const updateHandlers = new Set<() => void>();

export function registerCommandHandler(handler: CommandHandler): () => void {
    commandHandlers.add(handler);
    for (const handler of updateHandlers) handler();

    return () => {
        commandHandlers.delete(handler);
        for (const handler of updateHandlers) handler();
    };
}

export function registerCommandStateWatcher(callback: () => void): () => void {
    updateHandlers.add(callback);
    return () => updateHandlers.delete(callback);
}

export function isCommandEnabled(commandId: string): boolean {
    for (const handler of commandHandlers) if (handler.check(commandId)) return true;
    return false;
}

export function triggerCommand(command: protocol.CommandTriggerData): void {
    for (const handler of commandHandlers) {
        if (handler.check(command.commandId)) {
            handler.trigger(command);
            return;
        }
    }
}

export const CommandHandler: ComponentType<{
    onCheck: (commandId: string) => boolean;
    onCommand: (command: protocol.CommandTriggerData) => void;
}> = ({
    onCheck,
    onCommand,
    children,
}) => {
    useEffect(() => registerCommandHandler({ check: onCheck, trigger: onCommand }), [onCheck, onCommand]);
    return children;
};

/**
 * Hook to check command's enable state
 *
 * @param commandId Command ID
 * @returns Whether the command is enabled
 */
export function useCommandState(commandId: string): boolean {
    const [enabled, setEnabled] = useState(() => isCommandEnabled(commandId));
    useEffect(() => (registerCommandStateWatcher(() => setEnabled(isCommandEnabled(commandId)))), [commandId]);
    return enabled;
}
