<!--
@component
Drop down component that shows a list of items to pick.
-->

<script lang="ts" generics="T">
    import type { Snippet } from "svelte";
    import Button from "./Button.svelte";
    import IconLabel from "./IconLabel.svelte";

    const {
        label,
        selected,
        items,
        itemId = (item) => item,
        onSelect,
        enabled = true,
    }: {
        enabled?: boolean;
        selected: T;
        items: readonly T[];
        itemId?: (item: T) => unknown;
        onSelect: (item: T) => unknown;
        label: Snippet<[item: T]>;
    } = $props();

    let popover = $state<HTMLDivElement | null>(null);
</script>

<Button {enabled} onClick={(e) => popover?.togglePopover({ source: e.currentTarget })}>
    {@render label(selected)}
    <IconLabel type="drop-down" />
</Button>

<div class="popover" popover="auto" bind:this={popover}>
    <div class="content">
        {#each items as item (itemId(item))}
            <Button
                style="toolbar"
                toggled={itemId(selected) == itemId(item)}
                onClick={() => {
                    onSelect(item);
                    popover?.hidePopover();
                }}
            >
                {#if itemId(selected) == itemId(item)}
                    <IconLabel type="check" />
                {:else}
                    <IconLabel type="empty" />
                {/if}
                {@render label(item)}
            </Button>
        {/each}
    </div>
</div>

<style>
    .popover {
        margin: 0;
        left: anchor(left);
        top: calc(anchor(bottom) - 0.5px);
        padding: 0;
        border: 0;
        box-shadow: 0 0 12px #0000000f;

        > .content {
            display: flex;
            flex-direction: column;
            padding: 0.2rem;
            gap: 0.2rem;
            border: 1px solid #9f9f9f;
        }
    }
</style>
