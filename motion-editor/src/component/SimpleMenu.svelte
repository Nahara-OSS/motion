<script lang="ts">
    import type { ComponentProps, Snippet } from "svelte";
    import Menu from "./Menu.svelte";
    import TextLabel from "./TextLabel.svelte";
    import FlexFillLabel from "./FlexFillLabel.svelte";
    import type { KeyCombination } from "../keyboard";
    import KeybindHandler from "./KeybindHandler.svelte";
    import KeyCombinationName from "./KeyCombinationName.svelte";
    import KeybindLabel from "./KeybindLabel.svelte";
    import IconLabel from "./IconLabel.svelte";
    import Translation from "../util/Translation.svelte";

    const {
        name,
        enabled = true,
        keybindEnabled = true,
        toggled = false,
        dynamic = false,
        keys = [],
        leadingIcon,
        trailingIcon,
        onClick,
        children,
    }: {
        name: string | { translated: string };

        /**
         * Enable state.
         *
         * Disabling the menu button will prevent user from clicking the button and disabling keybind, even though
         * `keybindEnabled` is `true`.
         */
        enabled?: boolean;

        /**
         * Keybind enable state.
         *
         * The button remains clickable even if this property is `false`, but the keybind will not be registered to
         * global keyboard handler.
         */
        keybindEnabled?: boolean;

        toggled?: boolean;
        dynamic?: boolean;
        keys?: readonly KeyCombination[];
        leadingIcon?: ComponentProps<typeof IconLabel>["type"];
        trailingIcon?: ComponentProps<typeof IconLabel>["type"];
        onClick?: () => unknown;
        children?: Snippet<[]>;
    } = $props();
</script>

{#snippet menuLabel()}
    {#if leadingIcon != null}
        <IconLabel type={leadingIcon} />
    {/if}
    <TextLabel>
        {#if typeof name == "string"}
            {name}
        {:else}
            <Translation key={name.translated} />
        {/if}
    </TextLabel>
    {#if keys.length > 0 || trailingIcon != null}
        <FlexFillLabel />
    {/if}
    {#each keys as key}
        <KeybindLabel>
            <KeyCombinationName {key} />
        </KeybindLabel>
    {/each}
    {#if trailingIcon != null}
        <IconLabel type={trailingIcon} />
    {/if}
{/snippet}

{#if children}
    <Menu {enabled} {toggled} {dynamic} {onClick}>
        {#snippet label()}
            {@render menuLabel()}
        {/snippet}
        {@render children()}
    </Menu>{:else}
    <Menu {enabled} {toggled} {onClick}>
        {#snippet label()}
            {@render menuLabel()}
        {/snippet}
    </Menu>
{/if}

{#if keys.length > 0 && onClick}
    <KeybindHandler enabled={enabled && keybindEnabled} {keys} onKeyDown={onClick} />
{/if}
