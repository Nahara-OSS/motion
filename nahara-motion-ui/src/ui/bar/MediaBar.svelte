<script lang="ts">
    import type { IObjectContainer, ISceneContainerObject } from "@nahara/motion";
    import { app } from "../../appglobal";
    import { snapping } from "../../snapping";
    import Button from "../input/Button.svelte";
    import Dropdown from "../input/Dropdown.svelte";
    import { openPopupAt } from "../popup/PopupHost.svelte";
    import { getSnappingModeType } from "../popup/SnappingPopup";
    import SnappingPopup from "../popup/SnappingPopup.svelte";
    import TimeDisplay from "./TimeDisplay.svelte";

    const timelineSnapping = snapping.timelineStore;
    const seekhead = app.currentSeekheadStore;
    const scene = app.currentSceneStore;
    const playbackState = app.playbackStateStore;

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

    function playbackToggle(type: ReturnType<typeof app.getPlaybackState>) {
        app.setPlaybackState(app.getPlaybackState() != type ? type : "paused");
    }

    function seekBy(amount: number) {
        app.updateSeekhead({ ...$seekhead, position: Math.max($seekhead.position + amount, 0) });
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
            app.updateSeekhead({ ...$seekhead, position: maxEndTime });
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
        <Button label="Start <-" keys={["Home"]} on:click={() => app.updateSeekhead({ ...$seekhead, position: 0 })} />
        <Button label="{displayQuickSeekValue} <-" keys={["<-"]} on:click={() => seekBy(-quickSeekMs)} />
        <Button label={$playbackState == "paused" ? "Play" : "Pause"} keys={["Space"]} on:click={() => playbackToggle("forward")} />
        <Button label="-> {displayQuickSeekValue}" keys={["->"]} on:click={() => seekBy(quickSeekMs)} />
        <Button label="-> End" keys={["End"]} on:click={seekToEnd} />
    </div>
    <div class="right">
        <TimeDisplay time={$seekhead.position} />
    </div>
</div>

<style lang="scss">
    .media-bar {
        height: 48px;
        align-items: center;
        background-color: #efefef;
        border-top: 1px solid #d1d1d1;
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