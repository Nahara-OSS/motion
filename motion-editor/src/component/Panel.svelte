<!--
@component
Panel layout scaffold.
-->

<script lang="ts">
    import type { Snippet } from "svelte";

    const {
        toolbar,
        children,
    }: {
        /**
         * Toolbar snippet.
         *
         * The hovered state is meant to be passed to `<SimpleMenu keybindEnabled={hovered}>` or
         * `<KeybindHandler enabled={hovered}>` to enable key combinations only when user is hovering on the panel.
         */
        toolbar?: Snippet<[hovered: boolean]>;

        /**
         * Snippet for the main content of the panel.
         *
         * The hovered state is meant to be passed to `<SimpleMenu keybindEnabled={hovered}>` or
         * `<KeybindHandler enabled={hovered}>` to enable key combinations only when user is hovering on the panel.
         */
        children?: Snippet<[hovered: boolean]>;
    } = $props();

    let hovering = $state<boolean>(false);
</script>

<div class="panel" role="none" onpointerenter={() => (hovering = true)} onpointerleave={() => (hovering = false)}>
    {#if toolbar}
        <header>
            {@render toolbar(hovering)}
        </header>
    {/if}
    <main>
        {#if children}
            {@render children(hovering)}
        {/if}
    </main>
</div>

<style>
    .panel {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;

        > header {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            border-bottom: 1px solid #dfdfdf;
        }

        > main {
            position: relative;
            background-color: #ffffff;
            height: 0;
            flex-grow: 1;
            overflow: auto;
        }
    }
</style>
