<script context="module" lang="ts">
    export let openPopupAt: (x: number, y: number, title: string, component: any) => void;
</script>

<script lang="ts">
    import Popup from "./Popup.svelte";

    let x = 0;
    let y = 0;
    let title: string;
    let component: any;
    let box: HTMLDivElement;
    let wrapperBox: HTMLDivElement | undefined = undefined;

    openPopupAt = (px, py, ptitle, pcomponent) => {
        x = px - (box?.getBoundingClientRect()?.x ?? 0);
        y = py - (box?.getBoundingClientRect()?.y ?? 0);
        title = ptitle;
        component = pcomponent;
    };

    $: {
        let boxRect = box?.getBoundingClientRect();
        let wrapperRect = wrapperBox?.getBoundingClientRect();

        if (boxRect && wrapperRect) {
            if (wrapperRect.right > boxRect.right) x -= wrapperRect.width - 1;
            if (wrapperRect.bottom > boxRect.bottom) y -= wrapperRect.height - 1;
        }
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="popup-host" class:active={!!component} bind:this={box} on:mousedown|self={() => component = undefined}>
    {#if component}
        <div class="wrapper" style:left="{x}px" style:top="{y}px" bind:this={wrapperBox}>
            <Popup {title}><svelte:component this={component} /></Popup>
        </div>
    {/if}
</div>

<style lang="scss">
    .popup-host {
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