<script lang="ts">
    import type { IObjectContainer, ISceneContainerObject, PlaybackState } from "@nahara/motion";
    import { snapping } from "../../snapping";
    import Button from "../input/Button.svelte";
    import Dropdown from "../input/Dropdown.svelte";
    import { openPopupAt } from "../popup/PopupHost.svelte";
    import { getSnappingModeType } from "../popup/SnappingPopup";
    import SnappingPopup from "../popup/SnappingPopup.svelte";
    import TimeDisplay from "./TimeDisplay.svelte";
    import type { EditorImpl } from "../../App";

    export let editor: EditorImpl;
    const timelineSnapping = snapping.timelineStore;
    const seekhead = editor.playback.currentTimeStore;
    const playbackState = editor.playback.stateStore;
    const scene = editor.sceneStore;

    let quickSeekMs: number;
    let displayQuickSeekValue: string;
    
    $: {
        quickSeekMs = typeof $timelineSnapping == "string"
            ? 1000
            : $timelineSnapping.type == "grid" ? $timelineSnapping.msPerSegment
            : $timelineSnapping.type == "bpm" ? 60000 / $timelineSnapping.bpm / $timelineSnapping.division
            : 1000;
        displayQuickSeekValue = `${Math.round(quickSeekMs / 10) / 100}s`;
    }

    function playbackToggle(type: PlaybackState) {
        // app.setPlaybackState(app.getPlaybackState() != type ? type : "paused");
        editor.playback.changeState(editor.playback.state != type ? type : "paused");
    }

    function seekBy(amount: number) {
        // app.updateSeekhead({ ...$seekhead, position: Math.max($seekhead.position + amount, 0) });
        editor.playback.seekTo($seekhead + amount);
    }

    function seekToEnd() {
        if ($scene) {
            let maxEndTime = 0;

            function findMaxEndTime(container: IObjectContainer) {
                for (const obj of container) {
                    if (maxEndTime < obj.timeEnd) maxEndTime = obj.timeEnd;
                    if ((obj.object as ISceneContainerObject).isContainer)
                        findMaxEndTime(obj.object as ISceneContainerObject);
                }
            }

            findMaxEndTime($scene);
            // app.updateSeekhead({ ...$seekhead, position: maxEndTime });
            editor.playback.seekTo(maxEndTime);
        }
    }
</script>

<div class="media-bar">
    <div class="left">
        <Dropdown
            label="Snapping {getSnappingModeType($timelineSnapping).asShortDisplayName($timelineSnapping)}"
            on:click={e => openPopupAt(e.clientX, e.clientY, "Snapping", SnappingPopup)}
        />
    </div>
    <div class="middle">
        <Button label="Start <-" keys={["Home"]} on:click={() => editor.playback.seekTo(0)} />
        <Button label="{displayQuickSeekValue} <-" keys={["<-"]} on:click={() => seekBy(-quickSeekMs)} />
        <Button label={$playbackState == "paused" ? "Play" : "Pause"} keys={["Space"]} on:click={() => playbackToggle("playing-normal")} />
        <Button label="-> {displayQuickSeekValue}" keys={["->"]} on:click={() => seekBy(quickSeekMs)} />
        <Button label="-> End" keys={["End"]} on:click={seekToEnd} />
    </div>
    <div class="right">
        <TimeDisplay time={$seekhead} />
    </div>
</div>

<style lang="scss">
    .media-bar {
        height: 48px;
        align-items: center;
        background-color: var(--appbars-background);
        border-top: 1px solid var(--appbars-border);
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
    }
</style>