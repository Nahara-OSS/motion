<script lang="ts" generics="TNode">
    import type { Snippet } from "svelte";

    const {
        root,
        keyOf,
        childrenOf,
        label,
        properties,
    }: {
        root: TNode[];
        keyOf: (node: TNode) => unknown;
        childrenOf: (tree: TNode) => TNode[];
        label: Snippet<[node: TNode]>;
        properties: Snippet<[node: TNode]>;
    } = $props();
</script>

{#snippet nodeView(node: TNode, path: number[])}
    <div class="node">
        <header>
            <button type="button" class="expand-button" aria-label="Expand/Collapse"></button>
            <button type="button" class="content">
                {@render label(node)}
            </button>
        </header>

        <div class="properties">
            {@render properties(node)}
        </div>

        <div class="children">
            {#each childrenOf(node) as child, i (keyOf(child))}
                {@render nodeView(child, [...path, i])}
            {/each}
        </div>
    </div>
{/snippet}

{#each root as child, i (keyOf(child))}
    {@render nodeView(child, [i])}
{/each}

<style>
    .node {
        position: relative;

        > header {
            display: flex;
            flex-direction: row;
            height: 2rem;

            > button {
                appearance: none;
                -webkit-appearance: none;
                font-family: inherit;
                font-size: inherit;
                background-color: #ffffff;
                border: 1px solid transparent;
                box-sizing: border-box;
                text-align: left;
                padding-inline: 0.6rem;
                padding-block: 0;

                &:hover {
                    border-color: #9f9f9f;
                    background-color: #efefef;
                }

                &:active {
                    border-color: #7f7f7f;
                    background-color: #e7e7e7;
                }
            }

            > .expand-button {
                width: 2rem;
            }

            > .content {
                flex-grow: 1;
            }
        }

        > .properties {
            background-color: #efefef;
            display: flex;
            flex-direction: column;
            margin-inline-start: 2rem;
        }

        > .children {
            margin-inline-start: 2rem;
        }
    }
</style>
