<script lang="ts">
    export let time = 0;
    let major: string, minor: string;
    $: {
        let timeAbs = Math.abs(Math.floor(time));
        let seconds = Math.floor(timeAbs / 1000);
        let majorSeconds = (seconds % 60).toString().padStart(2, "0");
        let majorMinutes = Math.floor(seconds / 60).toString().padStart(2, "0");
        major = `${time >= 0 ? "" : "-"}${majorMinutes}:${majorSeconds}.`;
        minor = (timeAbs % 1000).toString().padStart(3, "0");
    }

    const digits = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `${d}`));
</script>

<div class="time-display">
    {#each major as ch}
        <span class="major" class:special={!digits.has(ch)}>{ch}</span>
    {/each}
    {#each minor as ch}
        <span class="minor">{ch}</span>
    {/each}
</div>

<style lang="scss">
    .time-display {
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        line-height: 1;
        font-feature-settings: "ss01" 1, "zero" 1;
        padding: 0 5px;

        .major, .minor {
            width: 1ch;
            text-align: center;
        }

        .major {
            font-size: 18px;
            &.special { width: unset; }
        }

        .minor {
            color: #7f7f7f;
        }
    }
</style>