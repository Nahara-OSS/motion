<!--
@component
Prop-controlled popover.

The visibility state of popover is controlled by `show` component property. The `show` property should be changed to
`false` when `onDismiss()` callback is called.

`source` may be provided to use as the anchor for positioning the popover.
-->

<script lang="ts">
    import type { Snippet } from "svelte";

    const {
        source,
        mode = "auto",
        anchor = "none",
        dynamic = false,
        show,
        onDismiss,
        children,
    }: {
        /**
         * Anchor of the popover.
         */
        source?: HTMLElement;

        /**
         * Popover mode.
         *
         * - `auto`: User can press `Escape` to click outside the popover to dismiss the popover;
         * - `manual`: The popover can only be dismissed by setting `show` property to `false`;
         * - `hint`: Dismiss other popovers with the same `hint` mode when this popover is displayed.
         */
        mode?: "auto" | "manual" | "hint";

        /**
         * - `none`: Center the popover at the middle of the page;
         */
        anchor?: "none";

        /**
         * Popover dynamic mode.
         *
         * Without dynamic mode, the content will be inserted into the popover right away. With dynamic mode, the
         * content will only be populated when the popover is visible. Default is `false`.
         */
        dynamic?: boolean;

        /**
         * Popover show state.
         */
        show: boolean;

        /**
         * Callback for when the popover is dismissed.
         */
        onDismiss: () => unknown;

        /**
         * Content of the popover.
         */
        children: Snippet<[]>;
    } = $props();

    let popover = $state<HTMLDivElement | null>(null);
    let popoverState = $state<string>("closed");

    function onBeforeToggle(e: ToggleEvent) {
        popoverState = e.newState;
        if (e.oldState == "open" && e.newState == "closed") onDismiss();
    }

    $effect(() => {
        if (show && popoverState == "closed") {
            popover?.showPopover({ source });
        } else if (!show && popoverState == "open") {
            popover?.hidePopover();
        }
    });
</script>

<div class={["popover", anchor]} popover={mode} bind:this={popover} onbeforetoggle={onBeforeToggle}>
    {#if !dynamic || show}
        {@render children()}
    {/if}
</div>

<style>
    .popover {
        padding: 0;
        border: 0;
        box-shadow: 0 0 12px #0000000f;
    }
</style>
