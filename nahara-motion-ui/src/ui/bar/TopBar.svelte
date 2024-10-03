<script lang="ts">
    import { concat, EncoderPipeline, MuxerPipeline, SceneRenderPipeline, type IPipeline } from "@nahara/motion-video";
    import { app } from "../../appglobal";
    import { openMenuAt } from "../menu/MenuHost.svelte";
    import type { IScene } from "@nahara/motion";

    const currentProject = app.currentProjectStore;
    const currentScene = app.currentSceneStore;

    function openFileMenu(e: MouseEvent) {
        openMenuAt(e.clientX, e.clientY, [
            {
                type: "simple",
                name: "Quick render",
                async click() {
                    const frameRate = 60;
                    const pipeline: IPipeline<IScene, any, [any, any, Blob]> = concat(
                        new SceneRenderPipeline(
                            $currentScene!.metadata.size.x,
                            $currentScene!.metadata.size.y,
                            frameRate, frameRate * 10
                        ),
                        new EncoderPipeline({
                            codec: "avc1.4d0028",
                            width: $currentScene!.metadata.size.x,
                            height: $currentScene!.metadata.size.y,
                            bitrate: 10_000_000,
                            framerate: frameRate
                        }),
                        new MuxerPipeline({
                            codec: "avc",
                            width: $currentScene!.metadata.size.x,
                            height: $currentScene!.metadata.size.y,
                            frameRate: frameRate
                        })
                    );

                    await pipeline.initialize(console.log);
                    pipeline.consume($currentScene!);

                    const result = await pipeline.finalize();
                    const blob = result[2];
                    const downloadLink = document.createElement("a");
                    downloadLink.href = URL.createObjectURL(blob);
                    downloadLink.download = "video.mp4";
                    downloadLink.click();
                    URL.revokeObjectURL(downloadLink.href);
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