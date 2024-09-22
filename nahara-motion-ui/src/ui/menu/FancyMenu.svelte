<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { DropdownEntry } from "./FancyMenu";
    import MenuEntry from "./MenuEntry.svelte";
    import TreeMenuEntry from "./TreeMenuEntry.svelte";

    export let data: DropdownEntry[];
    let highlight = false;

    let element: HTMLDivElement;
    const componentMapping: Record<string, any> = {
        "simple": MenuEntry,
        "tree": TreeMenuEntry,
        failback: MenuEntry
    };

    function stripProp<K extends string, T>(obj: T, prop: K): Omit<T, K> {
        obj = {...obj};
        delete (obj as any)[prop as string];
        return obj;
    }

    export function takeFocus() {
        element?.focus();
    }
</script>

<div
    class="fancy-menu" class:highlight
    bind:this={element}
>
    {#each data as entry}
        <svelte:component
            this={componentMapping[entry.type] ?? componentMapping.failback}
            {...stripProp(entry, "type")}
            on:closemenu
        ></svelte:component>
    {/each}
</div>

<style lang="scss">
    .fancy-menu {
        width: fit-content;
        max-width: 300px;
        min-width: 100px;
        min-height: 24px;
        padding: 2px;
        background-color: #efefef;
        border: 1px solid #0000007f;
        opacity: 0.8;
        transition: opacity 0.2s linear;

        &:hover {
            opacity: 1;
            transition: opacity 0.1s linear;
        }
    }
</style>