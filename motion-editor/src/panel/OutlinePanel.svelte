<script lang="ts">
    import { of, switchMap } from "rxjs";
    import FlexFillLabel from "../component/FlexFillLabel.svelte";
    import IconLabel from "../component/IconLabel.svelte";
    import Menu from "../component/Menu.svelte";
    import MenuBar from "../component/MenuBar.svelte";
    import MenuSeparator from "../component/MenuSeparator.svelte";
    import Panel from "../component/Panel.svelte";
    import SimpleMenu from "../component/SimpleMenu.svelte";
    import TextLabel from "../component/TextLabel.svelte";
    import { getEditorSession } from "../editor";
    import type { PanelMap } from "./panels";
    import Popover from "../component/Popover.svelte";
    import NewCompositionDialog from "../dialog/NewCompositionDialog.svelte";
    import { object, scene } from "@nahara/motion";
    import Button from "../component/Button.svelte";

    const {
        panelContent,
        onContentChange,
    }: {
        panelContent: PanelMap["outline"];
        onContentChange: (updater: (content: PanelMap["outline"]) => PanelMap["outline"]) => unknown;
    } = $props();

    let newCompositionDialog = $state(false);

    const editor = getEditorSession();
    const project = editor.project;
    const sceneSession = editor.project.pipe(switchMap((project) => project?.scene ?? of(null)));
    const sceneContent = sceneSession.pipe(switchMap((scene) => scene?.scene$ ?? of(null)));

    const activeCompositionIndex = $derived(
        $sceneContent?.editor?.activeCompositionId != null
            ? $sceneContent.compositions.findIndex((c) => c.compositionId == $sceneContent.editor.activeCompositionId)
            : -1,
    );

    function toggleVisibility(objectId: string, compositionId: string) {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        session.editScene(
            (s) => ({
                ...s,
                objects: {
                    ...s.objects,
                    [objectId]: {
                        ...s.objects[objectId],
                        visibility: {
                            ...s.objects[objectId].visibility,
                            [compositionId]: !(s.objects[objectId].visibility[compositionId] ?? true),
                        },
                    },
                },
            }),
            "Toggle object visibility",
        );
    }

    function toggleShowCompositions() {
        onContentChange((c) => ({ ...c, composition: c.composition == "selected-only" ? "all" : "selected-only" }));
    }

    function selectComposition(id: string) {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        session.editScene((s) => {
            if (s.editor.activeCompositionId == id) return s;
            return {
                ...s,
                editor: {
                    ...s.editor,
                    activeCompositionId: id,
                },
            };
        }, "Activate composition");
    }

    function newComposition(name: string | null) {
        if ($sceneSession == null) return;

        const session = $sceneSession;
        const id = crypto.randomUUID();

        session.editScene(
            (s) => ({
                ...s,
                editor: { ...s.editor, activeCompositionId: id },
                compositions: [...s.compositions, { compositionId: id, label: name }],
            }),
            "New composition",
        );

        newCompositionDialog = false;
    }

    function duplicateComposition(id: string) {}

    function deleteComposition(id: string) {
        if ($sceneSession == null) return;

        const session = $sceneSession;
        const composition = session.scene.compositions.find((c) => c.compositionId == id);

        session.editScene(
            (scene) => {
                const index = scene.compositions.findIndex((c) => c.compositionId == id);
                if (index == -1 || scene.compositions.length <= 1) return scene;

                const compositions = scene.compositions.filter((c) => c.compositionId != id);
                const nextCompositionId =
                    scene.editor.activeCompositionId == id
                        ? (compositions[index] ?? compositions[index - 1] ?? compositions[0]).compositionId
                        : scene.editor.activeCompositionId;

                return {
                    ...scene,
                    editor: { ...scene.editor, activeCompositionId: nextCompositionId },
                    compositions,
                    objects: Object.fromEntries(
                        Object.entries(scene.objects).map(([objectId, object]) => {
                            if (id in object.visibility) {
                                object = {
                                    ...object,
                                    visibility: Object.fromEntries(
                                        Object.entries(object.visibility).filter(([cid]) => cid != id),
                                    ),
                                };
                            }

                            return [objectId, object] as const;
                        }),
                    ),
                };
            },
            composition?.label != null ? `Delete "${composition.label}" composition` : "Delete composition",
        );
    }
</script>

<Panel>
    {#snippet toolbar()}
        <FlexFillLabel />
        <MenuBar>
            <Menu>
                {#snippet label()}
                    {#if panelContent.composition == "all"}
                        <TextLabel>Compositions</TextLabel>
                        <IconLabel type="drop-down" />
                    {:else}
                        <IconLabel
                            type={{ composition: `${activeCompositionIndex != -1 ? activeCompositionIndex + 1 : "?"}` }}
                        />
                        <IconLabel type="drop-down" />
                    {/if}
                {/snippet}
                {#if $sceneContent != null}
                    {#each $sceneContent.compositions as comp, i (comp.compositionId)}
                        <SimpleMenu
                            name={comp.label ?? `Composition #${i + 1}`}
                            onClick={() => selectComposition(comp.compositionId)}
                            toggled={comp.compositionId == $sceneContent.editor.activeCompositionId}
                            leadingIcon={comp.compositionId == $sceneContent.editor.activeCompositionId
                                ? "check"
                                : "empty"}
                            trailingIcon={{ composition: `${i + 1}` }}
                        />
                    {/each}
                {:else}
                    <SimpleMenu name="(no scene opened)" enabled={false} leadingIcon="empty" />
                {/if}
                <MenuSeparator />
                <SimpleMenu
                    name="New composition"
                    onClick={() => (newCompositionDialog = true)}
                    enabled={$sceneContent != null}
                    leadingIcon="empty"
                />
                <SimpleMenu
                    name="Duplicate current"
                    onClick={() =>
                        $sceneContent?.editor.activeCompositionId != null
                            ? duplicateComposition($sceneContent.editor.activeCompositionId)
                            : null}
                    enabled={$sceneContent != null}
                    leadingIcon="empty"
                />
                <SimpleMenu
                    name="Delete current"
                    onClick={() =>
                        $sceneContent?.editor.activeCompositionId != null
                            ? deleteComposition($sceneContent.editor.activeCompositionId)
                            : null}
                    enabled={$sceneContent != null && $sceneContent.compositions.length > 1}
                    leadingIcon="empty"
                />
                <MenuSeparator />
                <SimpleMenu
                    name="Show all compositions"
                    leadingIcon={panelContent.composition == "all" ? "check" : "empty"}
                    toggled={panelContent.composition == "all"}
                    onClick={toggleShowCompositions}
                />
            </Menu>
            {#if panelContent.composition == "all"}
                {#if $sceneContent != null}
                    {#each $sceneContent.compositions as comp, i (comp.compositionId)}
                        <Menu
                            onClick={() => selectComposition(comp.compositionId)}
                            toggled={comp.compositionId == $sceneContent.editor.activeCompositionId}
                        >
                            {#snippet label()}
                                <IconLabel type={{ composition: `${i + 1}` }} />
                            {/snippet}
                        </Menu>
                    {/each}
                {/if}
            {/if}
        </MenuBar>
    {/snippet}
    {#if $sceneContent != null && $sceneContent.rootIds.length > 0}
        <div class="content">
            {#each $sceneContent.rootIds as objectId (objectId)}
                {@render objectSnippet(objectId, $sceneContent)}
            {/each}
        </div>
    {:else if $sceneContent != null}
        <div class="notice">
            <p>There are no objects in the scene</p>
        </div>
    {:else}
        <div class="notice">
            <p>Open a scene to view outline</p>
        </div>
    {/if}
</Panel>

{#snippet objectSnippet(objectId: string, scene: scene.Scene)}
    <div class="entry">
        <div class="object">
            <Button style="toolbar">
                <TextLabel>{scene.objects[objectId].label ?? scene.objects[objectId].typeId}</TextLabel>
            </Button>
            {#if panelContent.composition == "all"}
                {#each scene.compositions as composition (composition.compositionId)}
                    <Button style="toolbar" onClick={() => toggleVisibility(objectId, composition.compositionId)}>
                        <IconLabel
                            type={(scene.objects[objectId].visibility[composition.compositionId] ?? true)
                                ? "check"
                                : "empty"}
                        />
                    </Button>
                {/each}
            {:else}
                <Button style="toolbar" onClick={() => toggleVisibility(objectId, scene.editor.activeCompositionId)}>
                    <IconLabel
                        type={(scene.objects[objectId].visibility[scene.editor.activeCompositionId] ?? true)
                            ? "check"
                            : "empty"}
                    />
                </Button>
            {/if}
        </div>
        <div class="children">
            {#each scene.objects[objectId].childrenIds as childId (childId)}
                {@render objectSnippet(childId, scene)}
            {/each}
        </div>
    </div>
{/snippet}

<Popover dynamic={true} show={newCompositionDialog} onDismiss={() => (newCompositionDialog = false)}>
    <NewCompositionDialog onDismiss={() => (newCompositionDialog = false)} onConfirm={newComposition} />
</Popover>

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

        .entry {
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            gap: 0.2rem;

            > .object {
                flex-shrink: 0;
                display: flex;
                flex-direction: row;
                gap: 0.2rem;

                > :global(:nth-child(1)) {
                    flex-grow: 1;
                }
            }

            > .children {
                display: flex;
                flex-direction: column;
                flex-shrink: 0;
                gap: 0.2rem;
                margin-inline-start: 1rem;
            }
        }
    }

    .notice {
        color: #7f7f7f;
        justify-content: center;
        align-items: center;
    }
</style>
