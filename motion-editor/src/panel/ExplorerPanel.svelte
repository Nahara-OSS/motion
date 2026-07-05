<script lang="ts">
    import { combineLatest, map, of, switchMap } from "rxjs";
    import { getEditorSession, SceneSession } from "../editor";
    import TextLabel from "../component/TextLabel.svelte";
    import Button from "../component/Button.svelte";
    import type { FolderItem } from "../files";
    import Panel from "../component/Panel.svelte";
    import MenuBar from "../component/MenuBar.svelte";
    import Menu from "../component/Menu.svelte";
    import IconLabel from "../component/IconLabel.svelte";
    import FlexFillLabel from "../component/FlexFillLabel.svelte";
    import KeybindLabel from "../component/KeybindLabel.svelte";
    import NewSceneDialog, { type NewSceneOptions } from "../dialog/NewSceneDialog.svelte";
    import MenuSeparator from "../component/MenuSeparator.svelte";
    import { type scene } from "@nahara/motion";
    import Popover from "../component/Popover.svelte";

    let selectedItems: readonly string[] = $state.raw([]);
    let lastClickTime = $state(0);
    let lastClickName = $state<string | null>(null);
    let newSceneDialog = $state(false);

    const editor = getEditorSession();
    const project = editor.project;
    const doubleClickTime = editor.settings.pipe(map((settings) => settings.accessiblity.doubleClickTime));
    const path = project.pipe(switchMap((project) => project?.path ?? of<readonly string[]>([])));
    const root = project.pipe(map((project) => project?.projectRoot));

    const content = combineLatest([path, root]).pipe(
        switchMap(([path, root]) => root?.trackContentAsObservable(path) ?? of(null)),
        map((entries) => entries?.sort((a, b) => a.name.localeCompare(b.name))),
    );

    function typeNameOf(entry: FolderItem): string {
        if (entry.contentType.startsWith("application/json")) return "JSON";
        if (entry.name.endsWith(".scene")) return "Scene";
        return entry.contentType;
    }

    function navigateTo(path: readonly string[]) {
        editor.project.value?.path.next(path);
    }

    function newScene() {
        newSceneDialog = true;
    }

    function selectAll() {
        if ($content != null) {
            selectedItems = $content.map((v) => v.name);
        }
    }

    function deselectAll() {
        selectedItems = [];
    }

    function deleteSelected() {}

    function onItemClick(e: MouseEvent, item: FolderItem) {
        const now = performance.now();
        const delta = now - lastClickTime;
        lastClickTime = now;

        if (delta <= $doubleClickTime && lastClickName == item.name) {
            selectedItems = [];
            lastClickName = null;
            onItemOpen(item);
        } else if (e.ctrlKey || e.shiftKey) {
            if (selectedItems.includes(item.name)) {
                const index = selectedItems.indexOf(item.name);
                if (index != -1) selectedItems = [...selectedItems.slice(0, index), ...selectedItems.slice(index + 1)];
            } else {
                selectedItems = [...selectedItems, item.name];
            }

            lastClickName = item.name;
        } else {
            selectedItems = [item.name];
            lastClickName = item.name;
        }

        lastClickTime = now;
    }

    async function onItemOpen(item: FolderItem) {
        if ($project == null) return;
        const prj = $project;
        const filePath = [...$path, item.name];

        switch (item.type) {
            case "folder":
                editor.project.value?.path?.next([...$path, item.name]);
                break;
            case "file": {
                if (item.name.endsWith(".scene")) {
                    const scene = await prj.projectRoot.readJson<scene.Scene>(filePath);
                    // TODO: Close if unsaved prompt
                    prj.scene.next(new SceneSession(prj, filePath, scene));
                    return;
                }

                break;
            }
        }
    }

    async function onNewScene(options: NewSceneOptions) {
        if ($project == null) return;
        const { name, startTick, endTick, tickRate, width, height, fps } = options;
        const prj = $project;
        const scenePath = [...$path, name + ".scene"];
        const scene: scene.Scene = {
            timeline: {
                startTick,
                endTick,
                tickRate,
            },
            editor: {
                activeCompositionId: "default",
            },
            graphics: {
                size: { width, height },
                fps,
            },
            audio: {
                sampleRate: 44100,
            },
            markers: [],
            compositions: [{ compositionId: "default", label: "Default" }],
            objects: {},
            rootIds: [],
        };

        await prj.projectRoot.writeJson(scenePath, scene);
        prj.scene.next(new SceneSession(prj, scenePath, scene));
        newSceneDialog = false;
    }
</script>

<Panel>
    {#snippet toolbar()}
        <MenuBar>
            <Menu>
                {#snippet label()}
                    <TextLabel>Add</TextLabel>
                {/snippet}
                <Menu onClick={newScene} enabled={$content != null}>
                    {#snippet label()}
                        <TextLabel>New scene</TextLabel>
                    {/snippet}
                </Menu>
                <Menu enabled={$content != null}>
                    {#snippet label()}
                        <TextLabel>New folder</TextLabel>
                    {/snippet}
                </Menu>
                <MenuSeparator />
                <Menu enabled={$content != null}>
                    {#snippet label()}
                        <TextLabel>Import files</TextLabel>
                    {/snippet}
                </Menu>
            </Menu>
            <Menu>
                {#snippet label()}
                    <TextLabel>Actions</TextLabel>
                {/snippet}
                <Menu onClick={selectAll} enabled={$content != null}>
                    {#snippet label()}
                        <TextLabel>Select all</TextLabel>
                        <FlexFillLabel />
                        <KeybindLabel>Ctrl + A</KeybindLabel>
                    {/snippet}
                </Menu>
                <Menu onClick={deselectAll} enabled={selectedItems.length > 0}>
                    {#snippet label()}
                        <TextLabel>Deselect all</TextLabel>
                        <FlexFillLabel />
                        <KeybindLabel>Esc</KeybindLabel>
                    {/snippet}
                </Menu>
                <Menu onClick={deleteSelected} enabled={selectedItems.length > 0}>
                    {#snippet label()}
                        <TextLabel>Delete selected</TextLabel>
                        <FlexFillLabel />
                        <KeybindLabel>Delete</KeybindLabel>
                    {/snippet}
                </Menu>
            </Menu>
            <Menu>
                {#snippet label()}
                    <TextLabel>View</TextLabel>
                {/snippet}
                <Menu toggled={true} onClick={() => {}}>
                    {#snippet label()}
                        <IconLabel type="check" />
                        <TextLabel>Grid view</TextLabel>
                    {/snippet}
                </Menu>
            </Menu>
        </MenuBar>
    {/snippet}
    <div class="explorer">
        <div class="path">
            <Button onClick={() => navigateTo([])}>
                <TextLabel>Project root</TextLabel>
            </Button>
            {#each $path as part, i}
                <Button onClick={() => navigateTo([...$path.slice(0, i + 1)])}>
                    <TextLabel>{part}/</TextLabel>
                </Button>
            {/each}
        </div>
        <div class="separator"></div>
        <div class="content">
            {#if $content != null}
                {#each $content.filter((i) => i.type == "folder") as entry, i (entry.name)}
                    <button
                        type="button"
                        class="entry"
                        class:selected={selectedItems.includes(entry.name)}
                        class:first={i == 0}
                        onclick={(e) => onItemClick(e, entry)}
                    >
                        <div class="details">
                            <div class="row name">{entry.name}/</div>
                            <div class="row content-type">Folder</div>
                        </div>
                    </button>
                {/each}
                {#each $content.filter((i) => i.type == "file") as entry, i (entry.name)}
                    <button
                        type="button"
                        class="entry"
                        class:selected={selectedItems.includes(entry.name)}
                        class:first={i == 0}
                        onclick={(e) => onItemClick(e, entry)}
                    >
                        <div class="preview"></div>
                        <div class="details">
                            <div class="row name">{entry.name}/</div>
                            <div class="row content-type">{typeNameOf(entry)}</div>
                        </div>
                    </button>
                {/each}
            {/if}
        </div>
    </div>
</Panel>

<Popover dynamic={true} show={newSceneDialog} onDismiss={() => (newSceneDialog = false)}>
    <NewSceneDialog onDismiss={() => (newSceneDialog = false)} onConfirm={onNewScene} />
</Popover>

<style>
    .explorer {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem;
        box-sizing: border-box;

        > .path {
            height: 2rem;
            overflow-x: scroll;
            display: flex;
            flex-direction: row;
            gap: 0.2rem;

            &::-webkit-scrollbar {
                display: none;
            }
        }

        > .separator {
            height: 1px;
            background-color: #dfdfdf;
        }

        > .content {
            height: 0;
            flex-grow: 1;
            overflow-y: scroll;
            position: relative;
            display: grid;
            gap: 0.2rem;
            grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
            grid-auto-rows: min-content;

            &::-webkit-scrollbar {
                display: none;
            }

            > .entry {
                appearance: none;
                -webkit-appearance: none;
                font-family: inherit;
                font-size: inherit;
                border: 1px solid #9f9f9f;
                background-color: #ffffff;
                padding: 0;
                display: flex;
                flex-direction: column;
                text-align: left;

                &:hover {
                    border-color: #7f7f7f;
                    background-color: #efefef;
                }

                &:active {
                    border-color: #3f3f3f;
                    background-color: #e7e7e7;
                }

                &.first {
                    grid-column-start: 1;
                }

                &.selected {
                    color: #ffffff;
                    border-color: #9f9f9f;
                    background-color: #3f3f3f;
                }

                > .preview {
                    aspect-ratio: 1 / 1;
                }

                > .details {
                    display: flex;
                    flex-direction: column;
                    padding: 0.2rem;

                    > .row {
                        height: 1.6rem;
                        padding-inline: 0.4rem;
                        align-items: center;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        align-content: center;
                        white-space: nowrap;

                        &.content-type {
                            opacity: 0.75;
                        }
                    }
                }
            }
        }
    }
</style>
