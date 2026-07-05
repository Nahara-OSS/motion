<script lang="ts">
    import Button from "../component/Button.svelte";
    import Dialog from "../component/Dialog.svelte";
    import TextField from "../component/TextField.svelte";
    import TextLabel from "../component/TextLabel.svelte";

    const {
        onDismiss,
        onConfirm,
    }: {
        onDismiss: () => unknown;
        onConfirm: (label: string | null) => unknown;
    } = $props();

    let name = $state<string>("");
    let focusTarget = $state<HTMLInputElement | null>(null);

    $effect(() => queueMicrotask(() => focusTarget?.focus()));
</script>

<Dialog {onDismiss}>
    {#snippet label()}
        <TextLabel>New composition</TextLabel>
    {/snippet}
    <div class="content">
        <p>A composition stores the visibility state of all objects in the scene.</p>
        <div class="label">
            <TextLabel>Composition name</TextLabel>
        </div>
        <TextField
            bind:inputElement={focusTarget}
            value={name}
            onValueChange={(value) => (name = value)}
            validation={name.trim() == "" ? { level: "info", message: "Default name will be used" } : null}
        />
    </div>
    {#snippet actions()}
        <Button onClick={() => onConfirm(name.trim() == "" ? null : name)}>
            <TextLabel>Confirm</TextLabel>
        </Button>
    {/snippet}
</Dialog>

<style>
    .content {
        width: 30rem;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .label {
            display: flex;
            flex-direction: row;
            padding: 0.2rem;
            gap: 0.2rem;
            height: 2rem;
            box-sizing: border-box;
            align-items: center;
        }

        p {
            margin: 0;
            padding-block: 0.4rem;
            padding-inline: 0.6rem;
        }
    }
</style>
