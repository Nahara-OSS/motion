<script lang="ts">
    import type { Snippet } from "svelte";
    import Button from "./Button.svelte";
    import IconLabel from "./IconLabel.svelte";

    const {
        label,
        actions,
        children,
        onDismiss,
    }: {
        label: Snippet<[]>;
        children: Snippet<[]>;
        actions?: Snippet<[]>;
        onDismiss?: () => unknown;
    } = $props();
</script>

<div class="dialog">
    <header>
        <div class="label">{@render label()}</div>
        {#if onDismiss}
            <Button style="toolbar" onClick={onDismiss}>
                <IconLabel type="close" />
            </Button>
        {/if}
    </header>
    <main>
        {@render children()}
    </main>
    {#if actions}
        <footer>
            {@render actions()}
        </footer>
    {/if}
</div>

<style>
    .dialog {
        display: flex;
        flex-direction: column;
        border: 1px solid #9f9f9f;

        > header,
        > footer {
            display: flex;
            flex-direction: row;
            padding: 0.5rem;
            background-color: #efefef;
            height: 3rem;
            box-sizing: border-box;
            align-items: center;
            user-select: none;
        }

        > header {
            border-bottom: 1px solid #dfdfdf;
            justify-content: space-between;

            > .label {
                display: flex;
                flex-direction: row;
                gap: 0.2rem;
                padding: 0.2rem;
                align-items: center;
            }
        }

        > main {
            position: relative;
            overflow-y: auto;
        }

        > footer {
            border-top: 1px solid #dfdfdf;
            justify-content: center;
            display: flex;
            flex-direction: row;
            gap: 0.2rem;
        }
    }
</style>
