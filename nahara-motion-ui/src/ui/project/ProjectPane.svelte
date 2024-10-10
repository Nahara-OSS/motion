<script lang="ts">
    import type { SceneMetadata } from "@nahara/motion";
    import type { EditorImpl } from "../../App";
    import Button from "../input/Button.svelte";
    import { openPopupAt } from "../popup/PopupHost.svelte";
    import SceneCreatePopup from "./SceneCreatePopup.svelte";

    interface ProjectPaneState {
        selectedSceneUids?: string[];
    }

    export let state: ProjectPaneState;
    export let editor: EditorImpl;

    const project = editor.projectStore;
    let selectedSceneUids = state.selectedSceneUids ?? [];
    let allScenes: [string, SceneMetadata | undefined][] = [];

    $: {
        state.selectedSceneUids = structuredClone(selectedSceneUids);
    }

    $: if ($project) $project.listAllScenes().then(list => allScenes = list);

    function refresh() {
        project.update(a => a);
    }

    function addScene(e: MouseEvent) {
        if (!$project) return;
        openPopupAt(e.clientX, e.clientY, "New scene", SceneCreatePopup, { editor, project: $project });
    }

    async function openScene(uid: string) {
        if (!$project) return;
        const scene = await $project.loadScene(uid);
        editor.openScene(scene);
    }
</script>

{#if $project}
    <div class="buttons">
        <Button label="Refresh" on:click={refresh} />
        <Button label="Add scene" on:click={addScene} />
        <Button label="Delete scene" disabled />
    </div>
    <div class="scenes">
        {#each allScenes as [sceneUid, sceneMeta]}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="scene"
                class:selected={selectedSceneUids.includes(sceneUid)}
                role="button"
                tabindex="0"
                on:click={() => openScene(sceneUid)}
            >
                <div class="label">{sceneMeta?.name ?? sceneUid}</div>
            </div>
        {/each}
    </div>
{/if}

<style lang="scss">
    .buttons {
        display: flex;
        padding: 5px;

        > :global(*) {
            margin: 0 4px 0 0;
        }
    }

    .scenes {
        height: calc(100% - 34px);
        overflow-y: scroll;
        border-top: 1px solid #d1d1d1;
        box-sizing: border-box;

        &::-webkit-scrollbar { display: none; }

        .scene {
            height: 24px;
            display: flex;
            flex-direction: row;

            .label {
                padding: 5px 8px;
                box-sizing: border-box;
            }

            &:hover { background-color: #0000000f; }
        }
    }
</style>