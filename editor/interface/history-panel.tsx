import type { ComponentType } from "preact";
import * as protocol from "../protocol.ts";
import { WorkspacePlaceholder } from "./workspace.tsx";
import { type Project, useProject } from "./project.tsx";
import { TextLabel } from "./label.tsx";
import { cx } from "./utils.ts";
import { triggerCommand, useCommandState } from "./command.tsx";
import { Button } from "./control.tsx";
import { TranslatedKeyLabel, TranslatedTextLabel } from "./translation.tsx";
import { useEditor } from "./editor.tsx";
import "./history-panel.css";

export const HistoryPanel: ComponentType = () => {
    const project = useProject();

    if (project == null) {
        return (
            <WorkspacePlaceholder>
                <TextLabel>Open a project to view its content</TextLabel>
            </WorkspacePlaceholder>
        );
    }

    return <HistoryPanelContent project={project} />;
};

const HistoryPanelContent: ComponentType<{ project: Project }> = ({ project }) => {
    const editor = useEditor();
    const [settings] = editor.useSettings();
    const state = project.useProjectState();
    const canUndo = useCommandState(protocol.CommandIds.Undo);
    const canRedo = useCommandState(protocol.CommandIds.Redo);
    const stack = state.history;

    return (
        <div class={cx("nahara-ui-history-panel")}>
            <div class={cx("actions")}>
                <Button
                    style="bordered"
                    state={canUndo ? "normal" : "disabled"}
                    onClick={() => (triggerCommand({
                        commandId: protocol.CommandIds.Undo,
                        state: protocol.CommandState.OneShot,
                        extra: {},
                    }))}
                >
                    <TranslatedTextLabel tr={protocol.CommandIds.Undo} />
                    {(settings.keyBinds[protocol.CommandIds.Undo] ?? []).map((bind, i) => (
                        <TranslatedKeyLabel key={i} value={bind} />
                    ))}
                </Button>
                <Button
                    style="bordered"
                    state={canRedo ? "normal" : "disabled"}
                    onClick={() => (triggerCommand({
                        commandId: protocol.CommandIds.Redo,
                        state: protocol.CommandState.OneShot,
                        extra: {},
                    }))}
                >
                    <TranslatedTextLabel tr={protocol.CommandIds.Redo} />
                    {(settings.keyBinds[protocol.CommandIds.Redo] ?? []).map((bind, i) => (
                        <TranslatedKeyLabel key={i} value={bind} />
                    ))}
                </Button>
            </div>
            <div class={cx("entries")}>
                {stack.redoStack.map((label, i) => (
                    <Button
                        style="generic"
                        onClick={() => project.redo(stack.redoStack.length - i)}
                    >
                        <TextLabel alt>{label}</TextLabel>
                    </Button>
                ))}
                <Button style="generic" state="activated">
                    <TextLabel>{stack.current}</TextLabel>
                </Button>
                {stack.undoStack.toReversed().map((label, i) => (
                    <Button
                        style="generic"
                        onClick={() => project.undo(i + 1)}
                    >
                        <TextLabel>{label}</TextLabel>
                    </Button>
                ))}
            </div>
        </div>
    );
};
