<!--
@component
Toolbar.
-->

<script lang="ts">
    import type { Snippet } from "svelte";

    const { children }: { children: Snippet<[]> } = $props();
</script>

<div class="toolbar">{@render children()}</div>

<style>
    .toolbar {
        display: flex;
        padding: 0.5rem;
        height: 3rem;
        box-sizing: border-box;
        gap: 0.2rem;
    }
</style>
