<script lang="ts">
    import { app } from "../../appglobal";

    const currentProject = app.currentProjectStore;
    const currentScene = app.currentSceneStore;
</script>

<div class="menu-bar">
    <div class="left">
        <div class="menu">File</div>
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