<script lang="ts">
    import Button from "../../component/Button.svelte";
    import IconLabel from "../../component/IconLabel.svelte";
    import KeybindLabel from "../../component/KeybindLabel.svelte";
    import KeyCombinationName from "../../component/KeyCombinationName.svelte";
    import TextLabel from "../../component/TextLabel.svelte";
    import { getEditorSession } from "../../editor";
    import { getKeyboardHandler, Keybind, type KeyCombination } from "../../keyboard";
    import Translation from "../../util/Translation.svelte";

    const editor = getEditorSession();
    const keybind = editor.keybind;
    const keyboard = getKeyboardHandler();

    let selected = $state<[categoryId: string, actionId: string] | null>(null);
    let currentCombination = $state<KeyCombination | null>(null);

    function nameOf(categoryId: string, actionId: string | null): string {
        switch (categoryId) {
            default:
                return actionId != null ? `${categoryId}.${actionId}` : categoryId;
        }
    }

    function onDocumentKeyDown(e: KeyboardEvent) {
        if (selected == null) return;
        e.preventDefault();
        currentCombination = { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, code: e.code };
    }

    function onDocumentKeyUp(e: KeyboardEvent) {
        if (selected == null) return;
        e.preventDefault();

        if (currentCombination != null) {
            const [categoryId, actionId] = selected;

            editor.keybind.next({
                ...editor.keybind.value,
                [categoryId]: {
                    ...(editor.keybind.value as any)[categoryId],
                    [actionId]: [...(editor.keybind.value as any)[categoryId][actionId], currentCombination],
                },
            });

            currentCombination = null;
            selected = null;
        }
    }

    $effect(() => {
        if (selected != null) return keyboard.lock();
    });

    function selectAction(categoryId: string, actionId: string) {
        if (selected == null || (selected[0] != categoryId && selected[1] != actionId)) {
            selected = [categoryId, actionId];
        } else {
            selected = null;
        }
    }

    function clearAction(categoryId: string, actionId: string) {
        editor.keybind.next({
            ...editor.keybind.value,
            [categoryId]: {
                ...(editor.keybind.value as any)[categoryId],
                [actionId]: [],
            },
        });
        selected = null;
    }

    function revertAction(categoryId: string, actionId: string) {
        editor.keybind.next({
            ...editor.keybind.value,
            [categoryId]: {
                ...(editor.keybind.value as any)[categoryId],
                [actionId]: (Keybind as any)[categoryId][actionId],
            },
        });
        selected = null;
    }
</script>

<svelte:document onkeydown={onDocumentKeyDown} onkeyup={onDocumentKeyUp} />

<table>
    <colgroup>
        <col class="action" />
        <col class="keys" />
        <col class="clearButton" />
        <col class="revertButton" />
    </colgroup>
    <thead>
        <tr>
            <th>
                <div class="label">Action</div>
            </th>
            <th>
                <div class="label">Key combinations</div>
            </th>
        </tr>
    </thead>
    <tbody>
        {#each Object.keys($keybind) as categoryId}
            <tr>
                <th colspan="4">
                    <div class="label">
                        <TextLabel>
                            <Translation key={nameOf(categoryId, null)} />
                        </TextLabel>
                    </div>
                </th>
            </tr>
            {#each Object.keys($keybind[categoryId as keyof Keybind]) as actionId}
                <tr>
                    <td>
                        <div class="label">
                            <TextLabel>
                                <Translation key={nameOf(categoryId, actionId)} />
                            </TextLabel>
                        </div>
                    </td>
                    <td>
                        <Button
                            style="toolbar"
                            toggled={selected != null && selected[0] == categoryId && selected[1] == actionId}
                            onClick={() => selectAction(categoryId, actionId)}
                        >
                            {#snippet tooltip()}
                                {#if currentCombination != null}
                                    <TextLabel>Release to add</TextLabel>
                                    <KeybindLabel>
                                        <KeyCombinationName key={currentCombination} />
                                    </KeybindLabel>
                                    <TextLabel>key combination</TextLabel>
                                {:else if selected != null && selected[0] == categoryId && selected[1] == actionId}
                                    <TextLabel>Press a key combination, or click again to cancel</TextLabel>
                                {:else}
                                    <TextLabel>Click to add key combination</TextLabel>{/if}
                            {/snippet}
                            {#if ($keybind as any)[categoryId][actionId].length == 0}
                                <TextLabel style="grayed">(no key combinations)</TextLabel>
                            {:else}
                                {#each ($keybind as any)[categoryId][actionId] as key}
                                    <KeybindLabel>
                                        <KeyCombinationName {key} />
                                    </KeybindLabel>
                                {/each}
                            {/if}
                        </Button>
                    </td>
                    <td>
                        <Button style="toolbar" onClick={() => clearAction(categoryId, actionId)}>
                            {#snippet tooltip()}
                                <TextLabel>Clear all key combinations</TextLabel>
                            {/snippet}
                            <IconLabel type="clear" />
                        </Button>
                    </td>
                    <td>
                        <Button style="toolbar" onClick={() => revertAction(categoryId, actionId)}>
                            {#snippet tooltip()}
                                <TextLabel>Reset to default</TextLabel>
                            {/snippet}
                            <IconLabel type="undo" />
                        </Button>
                    </td>
                </tr>
            {/each}
        {/each}
    </tbody>
</table>

<style>
    table {
        border-collapse: collapse;
        text-align: left;

        > colgroup {
            > .action {
                width: 20rem;
            }

            > .clearButton,
            > .revertButton {
                width: 2rem;
            }
        }

        th,
        td {
            padding: 0.1rem;
            height: 2rem;

            > .label {
                display: flex;
                flex-direction: row;
                gap: 0.2rem;
                align-items: center;
                padding-inline: 0.2rem;
                box-sizing: border-box;
            }

            &:first-child {
                padding-inline-start: 0;
            }

            &:last-child {
                padding-inline-end: 0;
            }

            > :global(*) {
                width: 100%;
            }
        }

        > thead > tr > th {
            &:first-child {
                padding-inline-start: 0.4rem;
            }
        }

        > tbody > tr > th {
            background-color: #efefef;
        }
    }
</style>
