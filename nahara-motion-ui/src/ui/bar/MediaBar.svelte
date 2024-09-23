<script lang="ts">
    import { app } from "../../appglobal";
    import { snapping } from "../../snapping";
    import Button from "../input/Button.svelte";

    const timelineSnapping = snapping.timelineStore;
    const seekhead = app.currentSeekheadStore;

    let timelineSnapSize = typeof $timelineSnapping == "string"
        ? 1000
        : $timelineSnapping.type == "grid" ? $timelineSnapping.msPerSegment
        : 1000;
    let displaySeekHotkeyLabel = `${timelineSnapSize / 1000}s`;

    function playbackToggle(type: ReturnType<typeof app.getPlaybackState>) {
        app.setPlaybackState(app.getPlaybackState() != type ? type : "paused");
    }

    function seekBy(amount: number) {
        app.updateSeekhead({ ...$seekhead, position: Math.max($seekhead.position + amount, 0) });
    }
</script>

<div class="media-bar">
    <div class="left"></div>
    <div class="middle">
        <Button label="Start <-" keys={["Home"]} on:click={() => app.updateSeekhead({ ...$seekhead, position: 0 })} />
        <Button label="{displaySeekHotkeyLabel} <-" keys={["<-"]} on:click={() => seekBy(-timelineSnapSize)} />
        <Button label="Play" keys={["Space"]} on:click={() => playbackToggle("forward")} />
        <Button label="-> {displaySeekHotkeyLabel}" keys={["->"]} on:click={() => seekBy(timelineSnapSize)} />
        <Button label="-> End" keys={["Home"]} />
    </div>
    <div class="right"></div>
</div>

<style lang="scss">
    .media-bar {
        display: flex;
        height: 48px;
        align-items: center;
        background-color: #efefef;
        border-top: 1px solid #d1d1d1;

        .middle {
            display: flex;
            flex: 1 1 auto;
            justify-content: center;
        }
    }
</style>