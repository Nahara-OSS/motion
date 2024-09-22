<script lang="ts">
    import type { DropdownEntry } from "./FancyMenu";
    import FancyMenu from "./FancyMenu.svelte";

    export let name: string = "???";
    export let description: string | undefined = undefined;
    export let icon: string | undefined = undefined;
    export let children: DropdownEntry[] = [];

    let showMenu = false;
    let childMenu: FancyMenu;

    function handleKeyPress(e: KeyboardEvent) {
        showMenu = true;
        childMenu?.takeFocus();
    }
</script>

<div
    class="entry token-button-normal"
    role="button"
    tabindex="0"
    on:mouseenter={() => showMenu = true}
    on:mouseleave={() => showMenu = false}
    on:focus={() => {}}
    on:blur={() => {}}
    on:keydown={handleKeyPress}
>
    <div class="label">{name}</div>
    {#if showMenu}
        <div class="detacher"><FancyMenu data={children} bind:this={childMenu} on:closemenu /></div>
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

        &:hover {
            border: 1px solid #2f2f2f;
        }

        .label {
            white-space: nowrap;
        }

        &::before {
            position: absolute;
            content: '';
            right: 4px;
            top: 50%;
            translate: 0 -50%;
            border-left: 5px solid #0000005f;
            border-top: 5px solid transparent;
            border-bottom: 5px solid transparent;
        }

        &:hover::before {
            border-left: 5px solid #000000;
        }

        .detacher {
            position: absolute;
            left: calc(100% + 1px);
            top: -3.5px;
        }
    }
</style>