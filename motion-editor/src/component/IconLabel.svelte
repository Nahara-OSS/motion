<script lang="ts">
    const {
        type,
    }: {
        type:
            | "empty"
            | "close"
            | "drag-handle"
            | "drop-up"
            | "drop-down"
            | "drop-right"
            | "check"
            | "notice"
            | "clear"
            | "undo"
            | "redo"
            | "add"
            | "delete"
            | "pointer"
            | "shapes"
            | "path"
            | "text"
            | { readonly composition: string };
    } = $props();
</script>

<svg viewBox="0 0 16 16">
    {#if type == "close"}
        <path d="M4,4 L12,12" stroke="#000000" fill="none" />
        <path d="M12,4 L4,12" stroke="#000000" fill="none" />
    {:else if type == "drag-handle"}
        {#each [4, 8, 12] as y}
            {#each [6, 10] as x}
                <circle cx={x} cy={y} r={1} stroke="none" fill="#000000" />
            {/each}
        {/each}
    {:else if type == "drop-up"}
        <path d="M8,6 L4,10 L12,10 Z" stroke="none" fill="#000000" />
    {:else if type == "drop-down"}
        <path d="M8,10 L4,6 L12,6 Z" stroke="none" fill="#000000" />
    {:else if type == "drop-right"}
        <path d="M10,8 L6,4 L6,12 Z" stroke="none" fill="#000000" />
    {:else if type == "check"}
        <path d="M4,8 L6,11 L13,4" stroke="#000000" fill="none" />
    {:else if type == "notice"}
        <circle cx={8} cy={8} r={5} stroke="#000000" fill="none" />
        <path d="M8,5 L8,9" stroke="#000000" fill="none" />
        <circle cx={8} cy={10.5} r={0.5} stroke="none" fill="#000000" />
    {:else if type == "clear"}
        <path d="M4,4 L12,12" stroke="#000000" fill="none" />
        <path d="M12,4 L4,12" stroke="#000000" fill="none" />
    {:else if type == "undo"}
        <path d="M6,6 L9,6 A1,1,90,0,1,9,13 L4,13" stroke="#000000" fill="none" />
        <path d="M6,4 L6,8 L4,6 Z" stroke="#000000" fill="none" />
    {:else if type == "add"}
        <path d="M4,8 L12,8" stroke="#000000" fill="none" />
        <path d="M8,4 8,12" stroke="#000000" fill="none" />
    {:else if type == "delete"}
        <path d="M4,8 L12,8" stroke="#000000" fill="none" />
    {:else if type == "pointer"}
        <path d="M2,2 L14,6 L11,9 L14,12 L12,14 L9,11 L6,14 Z" stroke="#000000" fill="none" />
    {:else if type == "shapes"}
        <rect x={2} y={2} width={8} height={8} stroke="#000000" fill="none" />
        <circle cx={10} cy={10} r={5} stroke="#000000" fill="none" />
    {:else if type == "path"}
        <path d="M3,12 Q3,3,12,3" stroke="#000000" fill="none" />
        <circle cx={2.5} cy={13.5} r={1.5} stroke="#000000" fill="none" />
        <circle cx={13.5} cy={2.5} r={1.5} stroke="#000000" fill="none" />
    {:else if type == "text"}
        <path d="M3,2 L13,2 L13,4 L12,4 L11,3 L9,3 L9,13 L10,14 L6,14 L7,13 L7,3 L5,3 L4,4 L3,4 Z" stroke="none" fill="#000000" />
    {:else if typeof type == "object" && "composition" in type}
        <text x={7} y={10} font-family="Inter" font-size={8} text-anchor="middle">{type.composition}</text>
        <path d="M2,2 L12,2 L12,12 L2,12 Z" stroke="#000000" fill="none" />
        <path d="M14,4 L14,14 L4,14" stroke="#000000" fill="none" />
    {/if}
</svg>

<style>
    svg {
        aspect-ratio: 1 / 1;
        height: 100%;
        stroke-width: 1;
    }
</style>
