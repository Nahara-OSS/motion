<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let name: string = "???";
    export let description: string | undefined = undefined;
    export let icon: string | undefined = undefined;
    export let click: ((e: MouseEvent) => any) | undefined = undefined;
    const dispatcher = createEventDispatcher();
</script>

<div
    class="entry token-button-normal"
    role="button"
    tabindex="0"
    on:click={e => {
        if (click) click(e);
        dispatcher("closemenu");
    }}
    on:keypress={e => (e.code == "Space" || e.code == "Enter") && click ? click : 0}
>
    <div class="label">{name}</div>
    {#if description}
        <div class="description">{description}</div>
    {/if}
</div>

<style lang="scss">
    .entry {
        position: relative;
        display: block;
        width: 100%;
        text-align: left;
        padding-right: 16px;
        border: 1px solid transparent;
        height: unset;

        &:hover {
            border: 1px solid #2f2f2f;
        }

        .label {
            white-space: nowrap;
        }

        .description {
            color: #7f7f7f;
        }
    }
</style>