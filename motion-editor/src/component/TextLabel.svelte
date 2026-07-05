<!--
@component
Text label component.

All it does is adding a simple `<span>` with inline padding.
-->

<script lang="ts">
    import type { Snippet } from "svelte";

    const { children }: { children: Snippet<[]> } = $props();
</script>

<span>{@render children()}</span>

<style>
    span {
        padding-inline: 0.4rem;
        white-space: nowrap;
    }
</style>
