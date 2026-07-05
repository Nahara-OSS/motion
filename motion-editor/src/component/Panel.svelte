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
        toolbar?: Snippet<[]>;
        children?: Snippet<[]>;
    } = $props();
</script>

<div class="panel">
    {#if toolbar}
        <header>
            {@render toolbar()}
        </header>
    {/if}
    <main>
        {#if children}
            {@render children()}
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
