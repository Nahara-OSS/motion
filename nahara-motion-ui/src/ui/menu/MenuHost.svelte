<script context="module" lang="ts">
    import type { DropdownEntry } from "./FancyMenu";
    import FancyMenu from "./FancyMenu.svelte";

    export let openMenuAt: (x: number, y: number, menu: DropdownEntry[]) => void;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<script lang="ts">
    let currentMenu: {
        x: number,
        y: number,
        menu: DropdownEntry[]
    } | undefined = undefined;

    let box: HTMLDivElement;

    openMenuAt = (x, y, menu) => {
        x -= box?.getBoundingClientRect()?.x ?? 0;
        y -= box?.getBoundingClientRect()?.y ?? 0;
        currentMenu = { x, y, menu };
    };
</script>

<div class="menu-host" class:active={!!currentMenu} bind:this={box} on:mousedown|self={() => currentMenu = undefined}>
    {#if currentMenu}
        <div class="wrapper" style:left="{currentMenu.x}px" style:top="{currentMenu.y}px">
            <FancyMenu data={currentMenu.menu} on:closemenu={() => currentMenu = undefined} />
        </div>
    {/if}
</div>

<style lang="scss">
    .menu-host {
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;

        &.active {
            width: 100%;
            height: 100%;
        }

        .wrapper {
            position: absolute;
        }
    }
</style>