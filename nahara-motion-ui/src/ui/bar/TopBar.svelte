<script lang="ts">
    import type { IObjectContainer, ISceneContainerObject } from "@nahara/motion";
    import { app } from "../../appglobal";
    import { openMenuAt } from "../menu/MenuHost.svelte";
    import { openPopupAt } from "../popup/PopupHost.svelte";
    import RenderPane from "../render/RenderPane.svelte";

    const currentProject = app.currentProjectStore;
    const currentScene = app.currentSceneStore;

    function openFileMenu(e: MouseEvent) {
        openMenuAt(e.clientX, e.clientY, [
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
                        saveAs: `${$currentScene!.metadata.name ?? 'scene'}.mp4`,
                        resWidth: $currentScene!.metadata.size.x,
                        resHeight: $currentScene!.metadata.size.y,
                        duration: maxEndTime / 1000
                    });
                },
            }
        ]);
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
    <div class="middle">
        <div class="menu">{$currentProject.metadata.name ?? "<unnamed project>"}{$currentScene ? ` / ${$currentScene.metadata.name ?? "<unnamed scene>"}` : ''}</div>
    </div>
    <div class="right">
        <div class="tab selected">General</div>
        <div class="tab">Design</div>
        <div class="tab">Animation</div>
    </div>
</div>

<style lang="scss">
    .menu-bar {
        height: 34px;
        background-color: #efefef;
        border-bottom: 1px solid #d1d1d1;
        box-sizing: border-box;
        display: grid;
        grid-auto-flow: column;
        padding: 0 8px;

        .left, .right, .middle {
            display: flex;
        }

        .middle {
            justify-content: center;
        }

        .right {
            justify-content: flex-end;
        }

        .tab, .menu {
            padding: 10px;
            &:hover { background-color: #0000000f; }
            &.selected { background-color: #fff; }
        }
    }
</style>