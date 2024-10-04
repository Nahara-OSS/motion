<script context="module" lang="ts">
    export const fields: Record<string, { color?: string, name?: string }> = {
        "x": { color: "#ff0000", name: "X"},
        "y": { color: "#00ff00", name: "Y"},
        "z": { color: "#0000ff", name: "Z"},
        "r": { color: "#ff0000", name: "R"},
        "g": { color: "#00ff00", name: "G"},
        "b": { color: "#0000ff", name: "B"},
        "a": { color: "#ffaf7f", name: "A"}
    };
</script>

<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import PropertyValuePart from "./PropertyValuePart.svelte";

    export let name = "";
    export let value: any = {};
    export let min: any = undefined;
    export let max: any = undefined;
    export let animatable = false;
    export let animating = false;

    const dispatcher = createEventDispatcher();
    let fieldOrdering: string[];
    $: {
        fieldOrdering = [];

        if (typeof value == "object") {
            fieldOrdering = ["x", "y", "z", "w", "r", "g", "b", "a"].filter(v => value[v] != null);
            fieldOrdering.push(...Object.keys(value)
                .filter(v => !fieldOrdering.includes(v))
                .filter(v => !["model"].includes(v)));
        }
    }
</script>
<tr>
    <th scope="row">{name}</th>
    <td class="value-td">
        {#if typeof value == "object"}
            {#each fieldOrdering as field}
                <PropertyValuePart
                    name={fields[field]?.name ?? field}
                    color={fields[field]?.color ?? "#ffffff"}
                    value={value[field]}
                    on:update={e => {
                        value = structuredClone(value);
                        value[field] = e.detail;
                        dispatcher("update", value);
                    }}
                />
            {/each}
        {:else if typeof value == "number"}
            <PropertyValuePart
                name="<->"
                {value} {min} {max}
                on:update={e => {
                    value = e.detail;
                    dispatcher("update", value);
                }}
            />
        {:else if typeof value == "boolean"}
            <input type="checkbox" bind:checked={value} on:input={() => dispatcher("update", !value)}>
        {:else if typeof value == "string"}
            <input
                type="text"
                bind:value={value}
                on:input={() => dispatcher("update", value)}
            >
        {/if}
    </td>
    <td>
        {#if animatable}
            <div
                class="keyframe-button"
                class:animating
                role="button"
                tabindex="0"
                on:mousedown={() => dispatcher("keyframebutton")}
            ></div>
        {/if}
    </td>
</tr>

<style lang="scss">
    tr {
        height: 24px;
        // &:nth-child(even) { background-color: #f7f7f7; }
        &:hover { background-color: #efefef; }
    }

    th, td {
        padding: 0;
        text-align: left;
    }

    th {
        padding-left: 8px;
        font-weight: normal;
    }

    .value-td {
        display: flex;
        padding-right: 12px;
    }

    input[type="text"] {
        border: 1px solid transparent;
        background-color: transparent;
        width: 100%;
        height: 24px;
        padding: 5px;
        box-sizing: border-box;

        &:hover {
            border: 1px solid #1d1d1d;
        }
    }

    input[type="checkbox"] {
        border: 1px solid transparent;
        background-color: transparent;
        margin: 0 0 0 5px;
        height: 24px;
        padding: 5px;
        box-sizing: border-box;
    }

    .keyframe-button {
        background-color: #fff;
        border: 2px solid #d1d1d1;
        rotate: 45deg;
        width: 8px;
        height: 8px;
        cursor: pointer;

        &:hover, &.animating {
            border: 2px solid #1d1d1d;
        }

        &.animating {
            background-color: #1d1d1d;
        }
    }
</style>