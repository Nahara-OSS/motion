<script lang="ts">
    import { SimpleProject, type IObjectContainer, type ISceneContainerObject } from "@nahara/motion";
    import { openMenuAt } from "../menu/MenuHost.svelte";
    import { openPopupAt } from "../popup/PopupHost.svelte";
    import RenderPane from "../render/RenderPane.svelte";
    import type { EditorImpl } from "../../App.svelte";
    import type { DropdownEntry } from "../menu/FancyMenu";

    export let editor: EditorImpl;
    const currentProject = editor.projectStore;
    const currentScene = editor.sceneStore;
    const allLayouts = editor.layout.allLayoutsStore;

    function openFileMenu(e: MouseEvent) {
        openMenuAt(e.clientX, e.clientY, [
            ...($currentScene ? [
                {
                    type: "simple",
                    name: "Save scene",
                    async click(event) {
                        if (!$currentProject || !$currentScene) return;
                        await $currentProject.saveScene($currentScene);
                    },
                }
            ] as DropdownEntry[] : []),
            {
                type: "simple",
                name: "Open/New project",
                async click(e) {
                    const handle = await showDirectoryPicker({ id: "project", mode: "readwrite" });
                    const meta = await SimpleProject.probeProjectMeta(handle);

                    if (!meta) {
                        // TODO show popup warning of project creation
                    }

                    const project = await SimpleProject.tryOpen(handle);
                    editor.openProject(project);
                }
            },
            {
                type: "simple",
                name: "Render current scene",
                async click() {
                    let maxEndTime = 0;

                    function findMaxEndTime(container: IObjectContainer) {
                        for (const obj of container) {
                            if (maxEndTime < obj.timeEnd) maxEndTime = obj.timeEnd;
                            if ((obj.object as ISceneContainerObject).isContainer)
                                findMaxEndTime(obj.object as ISceneContainerObject);
                        }
                    }

                    findMaxEndTime($currentScene!);
                    openPopupAt(e.clientX, e.clientY, "Render scene", RenderPane, {
                        scene: $currentScene,
                        saveAs: `${$currentScene!.metadata.name ?? 'scene'}.mp4`,
                        resWidth: $currentScene!.metadata.size.x,
                        resHeight: $currentScene!.metadata.size.y,
                        duration: maxEndTime / 1000
                    });
                },
            },
            ...($currentProject ? [
                {
                    type: "simple",
                    name: "Close project",
                    async click(event) {
                        editor.closeProject();
                    },
                }
            ] as DropdownEntry[] : [])
        ]);
    }

    let title: string;
    $: {
        if ($currentProject) {
            title = $currentProject.metadata?.name ?? "<unnamed project>";
            if ($currentScene) title += " / " + ($currentScene.metadata?.name ?? "<unnamed scene>");
            title += " · Nahara's Motion";
        } else {
            title = "Nahara's Motion";
        }
    }
</script>

<div class="menu-bar">
    <div class="left">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="menu" role="button" tabindex="0" on:click={openFileMenu}>File</div>
        <div class="menu">Edit</div>
        <div class="menu">Window</div>
        <div class="menu">Help</div>
    </div>
    <div class="spacer"></div>
    <div class="middle">
        <div class="menu">{title}</div>
    </div>
    <div class="spacer"></div>
    <div class="right">
        {#each $allLayouts as layout}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="tab"
                role="button"
                tabindex="0"
                on:click={() => {
                    editor.layout.current = layout.layout;
                    allLayouts.update(a => a);
                }}
            >{layout.name}</div>
        {/each}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="tab"
            role="button"
            tabindex="0"
            on:click={() => editor.layout.add(`Layout ${$allLayouts.length + 1}`, structuredClone(editor.layout.current))}
        >+</div>
    </div>
</div>

<style lang="scss">
    .menu-bar {
        height: 34px;
        background-color: var(--appbars-background);
        border-bottom: 1px solid var(--appbars-border);
        box-sizing: border-box;
        display: flex;
        grid-auto-flow: column;
        padding-right: calc(100% - env(titlebar-area-width));

        .left, .right, .middle {
            display: flex;
        }

        .spacer {
            flex: 1 1 auto;
            -webkit-app-region: drag;
        }

        .left {
            padding-left: 8px;
        }

        .middle {
            justify-content: center;
        }

        .right {
            padding-right: 8px;
        }

        .tab, .menu {
            padding: 10px;
            &:hover { background-color: #0000000f; }
            &.selected { background-color: #fff; }
        }
    }
</style>