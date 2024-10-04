<script lang="ts">
    import Property from "../properties/Property.svelte";

    interface TimelinePaneState {
        labelWidth?: number;
        zoom?: number;
        scroll?: number;
        followSeekhead?: boolean;
    }

    export let state: TimelinePaneState;
    export let onUpdate: () => any;
</script>

<table>
    <Property name="Zoom" value={state.zoom} min={1} max={1000} on:update={e => { state.zoom = e.detail; onUpdate(); }} />
    <Property name="Scroll" value={state.scroll} min={0} on:update={e => { state.scroll = e.detail; onUpdate(); }} />
    <Property name="Label width" value={state.labelWidth} min={100} max={500} on:update={e => { state.labelWidth = e.detail; onUpdate(); }} />
    <Property name="Follow seekhead" value={state.followSeekhead} on:update={e => { state.followSeekhead = e.detail; onUpdate(); }} />
</table>

<style lang="scss">
    table {
        margin: 0;
        border-spacing: 0;
    }
</style>