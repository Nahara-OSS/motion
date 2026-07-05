<script lang="ts">
    import type { Snippet } from "svelte";

    const { children }: { children: Snippet<[]> } = $props();
</script>

<div>{@render children()}</div>

<style>
    div {
        display: inline-block;
        font-size: 0.8rem;
        height: 1.5rem;
        padding-inline: 0.4rem;
        background-color: #efefef;
        border: 1px solid;
        border-bottom: 0.2rem solid;
        border-color: #9f9f9f;
        box-sizing: border-box;
        align-content: center;
        white-space: nowrap;
    }
</style>
