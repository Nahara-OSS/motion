<script lang="ts">
    import { of, switchMap } from "rxjs";
    import MenuBar from "../component/MenuBar.svelte";
    import Panel from "../component/Panel.svelte";
    import SimpleMenu from "../component/SimpleMenu.svelte";
    import { getEditorSession, type HistoryEntry } from "../editor";
    import Button from "../component/Button.svelte";
    import TextLabel from "../component/TextLabel.svelte";

    const editor = getEditorSession();
    const project = editor.project;
    const sceneSession = project.pipe(switchMap((project) => project?.scene ?? of(null)));
    const undoStack = sceneSession.pipe(switchMap((session) => session?.undoStack$ ?? of([])));
    const redoStack = sceneSession.pipe(switchMap((session) => session?.redoStack$ ?? of([])));

    function undo() {
        if ($sceneSession == null || $undoStack.length == 0) return;
        const session = $sceneSession;
        const entry = $undoStack[$undoStack.length - 1];
        session.revertScene(entry);
    }

    function redo() {
        if ($sceneSession == null || $redoStack.length == 0) return;
        const session = $sceneSession;
        const entry = $redoStack[0];
        session.revertScene(entry);
    }

    function revertTo(i: number) {
        if ($sceneSession == null) return;
        const session = $sceneSession;

        if (i + 1 < $undoStack.length) {
            session.revertScene($undoStack[i + 1]);
        } else if (i - $undoStack.length < $redoStack.length) {
            session.revertScene($redoStack[i - $undoStack.length]);
        }
    }
</script>

<Panel>
    {#snippet toolbar()}
        <MenuBar>
            <SimpleMenu name={{ translated: "edit.undo" }} onClick={undo} enabled={$undoStack.length > 0} />
            <SimpleMenu name={{ translated: "edit.redo" }} onClick={redo} enabled={$redoStack.length > 0} />
        </MenuBar>
    {/snippet}
    {#if $sceneSession != null}
        <div class="content">
            <Button style="toolbar" toggled={$undoStack.length == 0} onClick={() => revertTo(-1)}>
                <TextLabel>Open scene</TextLabel>
            </Button>
            {#each [...$undoStack, ...$redoStack] as entry, i (entry.id)}
                <Button style="toolbar" toggled={i == $undoStack.length - 1} onClick={() => revertTo(i)}>
                    <TextLabel>
                        {#if entry.name != null}
                            {#if i < $undoStack.length}
                                {entry.name}
                            {:else}
                                <span class="redo-entry-name">{entry.name}</span>
                            {/if}
                        {:else}
                            <i>(unknown edit)</i>
                        {/if}
                    </TextLabel>
                </Button>
            {/each}
        </div>
    {:else}
        <div class="notice">
            <p>Open a scene to view edit history</p>
        </div>
    {/if}
</Panel>

<style>
    .content,
    .notice {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }

    .content {
        padding: 0.5rem;
        gap: 0.2rem;
        box-sizing: border-box;
        overflow-y: auto;

        > :global(*) {
            flex-shrink: 0;
        }

        .redo-entry-name {
            color: #7f7f7f;
            font-style: italic;
        }
    }

    .notice {
        color: #7f7f7f;
        justify-content: center;
        align-items: center;
    }
</style>
