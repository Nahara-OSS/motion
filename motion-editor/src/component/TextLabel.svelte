<!--
@component
Text label component.

All it does is adding a simple `<span>` with inline padding.
-->

<script lang="ts">
    import type { Snippet } from "svelte";

    const {
        style = "normal",
        children,
    }: {
        style?: "normal" | "grayed";
        children: Snippet<[]>;
    } = $props();
</script>

<span class={style}>{@render children()}</span>

<style>
    span {
        padding-inline: 0.4rem;
        white-space: nowrap;

        &.grayed {
            opacity: 0.5;
        }
    }
</style>
