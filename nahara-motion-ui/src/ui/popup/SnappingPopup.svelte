<script lang="ts">
    import { snapping, type TimelineSnappingMode } from "../../snapping";
    import Dropdown from "../input/Dropdown.svelte";
    import { openMenuAt } from "../menu/MenuHost.svelte";
    import PropertyValuePart from "../properties/PropertyValuePart.svelte";
    import { AllModes, getSnappingModeType, type ModeDefinition } from "./SnappingPopup";

    const timelineSnap = snapping.timelineStore;

    let timelineSnapModeType = typeof $timelineSnap == "string" ? $timelineSnap : $timelineSnap.type;
    let timelineSnapMode: ModeDefinition<TimelineSnappingMode>;

    $: {
        timelineSnapModeType = typeof $timelineSnap == "string" ? $timelineSnap : $timelineSnap.type;
        timelineSnapMode = getSnappingModeType($timelineSnap);
    }

    function handleDropdownClick(e: MouseEvent) {
        openMenuAt(e.clientX, e.clientY, AllModes.map(mode => ({
            type: "simple",
            name: mode.name,
            click() {
                if (timelineSnapModeType == mode.type) return;
                snapping.setTimelineSnappingMode(mode.default);
            }
        })));
    }
</script>

<div class="snapping-popup">
    <table>
        <tr>
            <th scope="row">Type</th>
            <td><Dropdown label={timelineSnapMode.name} on:click={handleDropdownClick} /></td>
        </tr>
        {#if typeof $timelineSnap != "string" && $timelineSnap.type == "grid"}
            <tr>
                <th scope="row">Segment size (ms)</th>
                <td><PropertyValuePart name="<->" value={$timelineSnap.msPerSegment} on:update={e => {
                    snapping.setTimelineSnappingMode({ ...$timelineSnap, msPerSegment: e.detail });
                }} /></td>
            </tr>
        {:else if typeof $timelineSnap != "string" && $timelineSnap.type == "bpm"}
            <tr>
                <th scope="row">Beat per minute</th>
                <td><PropertyValuePart name="<->" value={$timelineSnap.bpm} on:update={e => {
                    snapping.setTimelineSnappingMode({ ...$timelineSnap, bpm: e.detail });
                }} /></td>
            </tr>
            <tr>
                <th scope="row">Beat division (1/x)</th>
                <td><PropertyValuePart name="<->" value={$timelineSnap.division} on:update={e => {
                    snapping.setTimelineSnappingMode({ ...$timelineSnap, division: e.detail });
                }} /></td>
            </tr>
        {/if}
    </table>
</div>

<style lang="scss">
    table {
        margin: 0;
        border-spacing: 0;

        td {
            padding: 0;
        }

        th[scope="row"] {
            text-align: left;
            min-width: 100px;
            font-weight: normal;
            padding: 0 16px 0 8px;
        }
    }
</style>