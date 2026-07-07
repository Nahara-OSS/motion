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
    import { createSceneUpdater, getEditorSession } from "../editor";
    import type { PanelMap } from "./panels";
    import Popover from "../component/Popover.svelte";
    import NewCompositionDialog from "../dialog/NewCompositionDialog.svelte";
    import * as motion from "@nahara/motion";
    import Button from "../component/Button.svelte";
    import Translation from "../util/Translation.svelte";

    const {
        panelContent,
        onContentChange,
    }: {
        panelContent: PanelMap["outline"];
        onContentChange: (updater: (content: PanelMap["outline"]) => PanelMap["outline"]) => unknown;
    } = $props();

    let newCompositionDialog = $state(false);

    const editor = getEditorSession();
    const keybind = editor.keybind;
    const objectTypes = organizeObjectTypesToTree(editor.bundle.objectTypes.values());
    const project = editor.project;
    const sceneSession = editor.project.pipe(switchMap((project) => project?.scene ?? of(null)));
    const sceneContent = sceneSession.pipe(switchMap((scene) => scene?.scene$ ?? of(null)));
    const selectedObjectIds = sceneSession.pipe(switchMap((scene) => scene?.selectedObjectIds ?? of([] as string[])));

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

    function addObject(type: motion.object.ObjectType<unknown, unknown>) {
        if ($sceneSession == null) return;

        const session = $sceneSession;
        const selectedObjectIds = session.selectedObjectIds.value;
        const createdObjectIds: string[] = [];

        session.editScene(
            createSceneUpdater((editor) => {
                if (selectedObjectIds.length == 0) {
                    const objectId = editor.newDefaultObject(type);
                    editor.updateChildrenList(null, (ids) => [...ids, objectId]);
                    createdObjectIds.push(objectId);
                } else {
                    for (const parentId of selectedObjectIds) {
                        const objectId = editor.newDefaultObject(type);
                        editor.updateChildrenList(parentId, (ids) => [...ids, objectId]);
                        createdObjectIds.push(objectId);
                    }
                }
            }),
            "Add object",
        );

        session.selectedObjectIds.next(createdObjectIds);
    }

    function selectObject(objectId: string | null, multiselect: "none" | "pick") {
        if ($sceneSession == null) return;

        const session = $sceneSession;

        switch (multiselect) {
            case "none": {
                session.selectedObjectIds.next(objectId != null ? [objectId] : []);
                return;
            }

            case "pick": {
                if (objectId == null) return;
                const ids = session.selectedObjectIds.value;
                const index = ids.indexOf(objectId);
                if (index == -1) session.selectedObjectIds.next([...ids, objectId]);
                else session.selectedObjectIds.next([...ids.slice(0, index), ...ids.slice(index + 1)]);
            }
        }
    }

    function selectAll() {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        const ids = Object.keys(session.scene.objects);
        session.selectedObjectIds.next(ids);
    }

    function deselectAll() {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        session.selectedObjectIds.next([]);
    }

    function deleteSelected() {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        const selectedIds = session.selectedObjectIds.value;

        const edit = session.editScene(
            createSceneUpdater((editor) => {
                for (const id of selectedIds) {
                    if (editor.scene.objects[id] != null) editor.deleteObject(id);
                }
            }),
            selectedIds.length > 1 ? "Delete objects" : "Delete object",
        );

        if (edit != null) {
            session.selectedObjectIds.next([]);
        }
    }

    function duplicateSelected() {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        const selectedObjectIds = session.selectedObjectIds.value;
        const createdObjectIds: string[] = [];

        session.editScene(
            createSceneUpdater((editor) => {
                const query = motion.scene.query(editor.scene, selectedObjectIds);

                for (const sourceId of selectedObjectIds) {
                    const parentId = motion.scene.findParentId(editor.scene, sourceId);
                    const clonedId = editor.cloneFrom(query, sourceId);

                    editor.updateChildrenList(parentId, (ids) => {
                        const index = ids.indexOf(sourceId) + 1;
                        return [...ids.slice(0, index), clonedId, ...ids.slice(index)];
                    });

                    createdObjectIds.push(clonedId);
                }
            }),
            selectedObjectIds.length > 1 ? "Duplicate objects" : "Duplicate object",
        );

        session.selectedObjectIds.next(createdObjectIds);
    }

    interface FolderEntry {
        name: string;
        folders: FolderEntry[];
        objectTypes: ObjectTypeEntry[];
    }

    interface ObjectTypeEntry {
        name: string;
        namespace: string;
        type: motion.object.ObjectType<unknown, unknown>;
    }

    function organizeObjectTypesToTree(
        list: Iterable<motion.object.ObjectType<unknown, unknown>>,
    ): [FolderEntry[], ObjectTypeEntry[]] {
        const folders: FolderEntry[] = [];
        const objectTypes: ObjectTypeEntry[] = [];

        for (const objectType of list) {
            const match = objectType.typeId.match(/([A-Za-z0-9-_]+):([A-Za-z0-9-_/]+)/);

            if (!match) {
                console.warn(`Object type with ID '${objectType.typeId}' does not follows the convention!`);
                objectTypes.push({ name: objectType.typeId, namespace: "unknown", type: objectType });
                continue;
            }

            const [_, namespace, path] = match;
            const parts = path.split("/");
            let currentFolders = folders;
            let currentObjectTypes = objectTypes;

            for (let i = 0; i < parts.length; i++) {
                if (i < parts.length - 1) {
                    let nextFolder = currentFolders.find((f) => f.name == parts[i]);

                    if (nextFolder == null) {
                        nextFolder = { name: parts[i], folders: [], objectTypes: [] };
                        currentFolders.push(nextFolder);
                    }

                    currentFolders = nextFolder.folders;
                    currentObjectTypes = nextFolder.objectTypes;
                } else {
                    currentObjectTypes.push({ name: parts[i], namespace, type: objectType });
                }
            }
        }

        return [folders, objectTypes];
    }
</script>

<Panel>
    {#snippet toolbar(keybindEnabled)}
        <MenuBar>
            <SimpleMenu name="Add object" dynamic={true}>
                {@render objectTypeMenu(objectTypes[0], objectTypes[1], "object.group")}
            </SimpleMenu>
            <SimpleMenu name={{ translated: "edit" }}>
                <SimpleMenu
                    name={{ translated: "edit.duplicate" }}
                    keys={$keybind.edit.duplicate}
                    enabled={$sceneContent != null && $selectedObjectIds.length > 0}
                    {keybindEnabled}
                    onClick={duplicateSelected}
                />
                <MenuSeparator />
                <SimpleMenu
                    name={{ translated: "edit.selectAll" }}
                    keys={$keybind.edit.selectAll}
                    enabled={$sceneContent != null}
                    {keybindEnabled}
                    onClick={selectAll}
                />
                <SimpleMenu
                    name={{ translated: "edit.deselectAll" }}
                    keys={$keybind.edit.deselectAll}
                    enabled={$sceneContent != null && $selectedObjectIds.length > 0}
                    {keybindEnabled}
                    onClick={deselectAll}
                />
                <MenuSeparator />
                <SimpleMenu
                    name={{ translated: "edit.delete" }}
                    keys={$keybind.edit.delete}
                    enabled={$sceneContent != null && $selectedObjectIds.length > 0}
                    {keybindEnabled}
                    onClick={deleteSelected}
                />
            </SimpleMenu>
        </MenuBar>
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
        <div
            class="content"
            role="none"
            onclick={(e) => (e.target == e.currentTarget ? selectObject(null, "none") : 0)}
        >
            {#each $sceneContent.rootIds.toReversed() as objectId (objectId)}
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

{#snippet objectTypeMenu(folders: FolderEntry[], objectTypes: ObjectTypeEntry[], prefix: string)}
    {#each folders as folder}
        <Menu>
            {#snippet label()}
                <TextLabel><Translation key="{prefix}.{folder.name}" /></TextLabel>
                <FlexFillLabel />
                <IconLabel type="drop-right" />
            {/snippet}
            {@render objectTypeMenu(folder.folders, folder.objectTypes, `${prefix}.${folder.name}`)}
        </Menu>
    {/each}
    {#if folders.length > 0 && objectTypes.length > 0}
        <MenuSeparator />
    {/if}
    {#each objectTypes as objectType}
        <Menu enabled={$sceneSession != null} onClick={() => addObject(objectType.type)}>
            {#snippet label()}
                <TextLabel><Translation key="object.type.{objectType.type.typeId}" /></TextLabel>
                <TextLabel style="grayed"><Translation key="object.namespace.{objectType.namespace}" /></TextLabel>
            {/snippet}
        </Menu>
    {/each}
    {#if folders.length == 0 && objectTypes.length == 0}
        <SimpleMenu name="(no objects)" enabled={false} />
    {/if}
{/snippet}

{#snippet objectSnippet(objectId: string, scene: motion.scene.Scene)}
    <div class="entry">
        <div class="object">
            <Button
                style="toolbar"
                toggled={$selectedObjectIds.includes(objectId)}
                onClick={(e) => selectObject(objectId, e.ctrlKey || e.shiftKey ? "pick" : "none")}
            >
                {#if scene.objects[objectId].label != null}
                    <TextLabel>{scene.objects[objectId].label}</TextLabel>
                {:else}
                    <TextLabel><Translation key="object.type.{scene.objects[objectId].typeId}" /></TextLabel>
                {/if}
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
        {#if scene.objects[objectId].childrenIds.length > 0}
            <div class="children">
                <!-- Objects in reversed order because higher layer objects are rendered last -->
                <!-- TODO: Or maybe this should be a settings? -->
                {#each scene.objects[objectId].childrenIds.toReversed() as childId (childId)}
                    {@render objectSnippet(childId, scene)}
                {/each}
            </div>
        {/if}
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
                position: relative;
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
