<script lang="ts">
    import type { KeyCombination } from "../keyboard";

    const { key }: { key: KeyCombination } = $props();
</script>

{key.ctrl ? "Ctrl +" : ""}
{key.alt ? "Alt +" : ""}
{key.shift ? "Shift +" : ""}
{#if key.code.startsWith("Key")}
    {key.code.substring(3)}
{:else if key.code.startsWith("Digit")}
    {key.code.substring(5)}
{:else if key.code == "ArrowLeft"}
    &leftarrow;
{:else if key.code == "ArrowRight"}
    &rightarrow;
{:else if key.code == "ArrowUp"}
    &uparrow;
{:else if key.code == "ArrowDown"}
    &downarrow;
{:else if key.code == "Escape"}
    Esc
{:else if key.code == "Slash"}
    /
{:else if key.code == "Backslash"}
    \
{:else}
    {key.code}
{/if}
