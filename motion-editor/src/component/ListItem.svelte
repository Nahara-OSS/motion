<!--
@component
Item in a vertical list with main supporting, leading and trailing contents.
-->

<script lang="ts">
    import type { Snippet } from "svelte";

    const {
        label,
        supporting,
        leading,
        trailing,
    }: {
        label: Snippet<[]>;
        supporting?: Snippet<[]>;
        leading?: Snippet<[]>;
        trailing?: Snippet<[]>;
    } = $props();
</script>

<div class="list-item">
    {#if leading}
        <div class="leading">
            {@render leading()}
        </div>
    {/if}
    <div class="text">
        <div class="label">
            {@render label()}
        </div>
        {#if supporting}
            <div class="supporting">
                {@render supporting()}
            </div>
        {/if}
    </div>
    {#if trailing}
        <div class="trailing">
            {@render trailing()}
        </div>
    {/if}
</div>

<style>
    .list-item {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0.5rem;
        gap: 1rem;

        &:hover {
            background-color: #f7f7f7;
        }

        > .text {
            width: 0;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            border: 1px solid transparent;

            > .label,
            > .supporting {
                display: flex;
                flex-direction: row;
                padding: 0.2rem;
                align-items: center;

                > :global(span) {
                    white-space: unset;
                }
            }

            > .supporting {
                opacity: 0.5;
            }
        }
    }
</style>
