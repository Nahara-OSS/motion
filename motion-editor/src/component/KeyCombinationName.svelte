<script lang="ts">
    import type { KeyCombination } from "../keyboard";

    const { key }: { key: KeyCombination } = $props();
</script>

{key.ctrl ? "Ctrl +" : ""}
{key.alt ? "Alt +" : ""}
{key.shift ? "Shift +" : ""}
{#if key.code.startsWith("Key")}
    {key.code.substring(3)}
{:else if key.code == "ArrowLeft"}
    &lt;-
{:else if key.code == "ArrowRight"}
    -&gt;
{:else if key.code == "Escape"}
    Esc
{:else if key.code == "Slash"}
    /
{:else if key.code == "Backslash"}
    \
{:else}
    {key.code}
{/if}
