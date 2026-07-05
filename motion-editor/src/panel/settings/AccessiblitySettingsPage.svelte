<script lang="ts">
    import ListItem from "../../component/ListItem.svelte";
    import TextField, { type ValidateResult } from "../../component/TextField.svelte";
    import TextLabel from "../../component/TextLabel.svelte";
    import { getEditorSession } from "../../editor";

    const editor = getEditorSession();
    const settings = editor.settings;

    let doubleClickTime = $state<string>("");

    const doubleClickTimeValidation = $derived(validateNumber(doubleClickTime));

    function validateNumber(value: string): ValidateResult | null {
        if (value == "") return { level: "error", message: "Value is empty" };
        if (Number.isNaN(+value)) return { level: "error", message: "Invalid input" };
        return null;
    }

    $effect(() => {
        doubleClickTime = `${$settings.accessiblity.doubleClickTime}`;
    });

    $effect(() => {
        if (doubleClickTimeValidation == null) {
            editor.settings.next({
                ...editor.settings.value,
                accessiblity: {
                    ...editor.settings.value.accessiblity,
                    doubleClickTime: +doubleClickTime,
                },
            });
        }
    });
</script>

<ListItem>
    {#snippet label()}
        <TextLabel>Double-click duration</TextLabel>
    {/snippet}
    {#snippet supporting()}
        <TextLabel>Maximum amount of time between two consecutive clicks to recognize as double-click</TextLabel>
    {/snippet}
    {#snippet trailing()}
        <div class="row">
            <TextField
                value={doubleClickTime}
                validation={doubleClickTimeValidation}
                onValueChange={(value) => (doubleClickTime = value)}
            />
            <div class="label">
                <TextLabel>ms</TextLabel>
            </div>
        </div>
    {/snippet}
</ListItem>

<style>
    .row {
        display: flex;
        flex-direction: row;
        gap: 0.2rem;
        align-items: center;
        width: 8rem;

        > :global(:first-child) {
            flex-grow: 1;
        }
    }
</style>
