<!--
@component
Standard Nahara's Motion button.

The main `onClick` event should be used to handle button clicks. Pointer events like `onPointerDown` should only be used
if there is a need to prevent default behavior or stop event propagation (eg: close button stops the event from
propagating to tab button).
-->

<script lang="ts" module>
    export type ButtonType = "button" | "submit" | "reset";
    export type ButtonStyle = "normal" | "toolbar";
</script>

<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        type = "button",
        style = "normal",
        enabled = true,
        toggled = false,
        tooltip,
        children,
        onClick,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerEnter,
        onPointerLeave,
    }: {
        /**
         * Type of the button.
         *
         * - `button`: Act as regular button. The `onClick` event listener should be provided if this type is used.
         * - `submit`: Act as form submit button.
         * - `reset`: Act as form reset button.
         */
        type?: ButtonType;

        /**
         * Style of the button.
         *
         * - `normal` (default): Normal button style.
         * - `toolbar`: Toolbar button style. As the name implied, buttons of this style are typically used in toolbars.
         */
        style?: ButtonStyle;

        /**
         * Enable state of button.
         *
         * The button is enabled by default.
         */
        enabled?: boolean;

        /**
         * Toggle state of button.
         *
         * The toggle state is typically used to indicate whether the option is activated or selected. The button is not
         * toggled by default.
         */
        toggled?: boolean;

        /**
         * Button binding.
         */
        button?: HTMLButtonElement | null;

        /**
         * Tooltip content.
         *
         * The tooltip will be displayed when user is hovering on the button.
         */
        tooltip?: Snippet<[]>;

        /**
         * Button content.
         *
         * The content of the button should only contains the components that are belongs to label family, such as text
         * label, icon label or keybind label.
         */
        children: Snippet<[]>;

        onClick?: (e: MouseEvent & { currentTarget: HTMLButtonElement }) => unknown;
        onPointerDown?: (e: PointerEvent & { currentTarget: HTMLButtonElement }) => unknown;
        onPointerMove?: (e: PointerEvent & { currentTarget: HTMLButtonElement }) => unknown;
        onPointerUp?: (e: PointerEvent & { currentTarget: HTMLButtonElement }) => unknown;
        onPointerEnter?: (e: PointerEvent & { currentTarget: HTMLButtonElement }) => unknown;
        onPointerLeave?: (e: PointerEvent & { currentTarget: HTMLButtonElement }) => unknown;
    } = $props();

    let tooltipElement = $state<HTMLDivElement | null>(null);

    function onButtonPointerEnter(e: PointerEvent & { currentTarget: HTMLButtonElement }) {
        if (onPointerEnter) onPointerEnter(e);
        tooltipElement?.showPopover({ source: e.currentTarget });
    }

    function onButtonPointerLeave(e: PointerEvent & { currentTarget: HTMLButtonElement }) {
        if (onPointerLeave) onPointerLeave(e);
        tooltipElement?.hidePopover();
    }
</script>

<button
    {type}
    class={[style]}
    class:toggled
    disabled={!enabled}
    onclick={onClick}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointerenter={onButtonPointerEnter}
    onpointerleave={onButtonPointerLeave}
>
    {@render children()}
</button>

{#if tooltip}
    <div class="tooltip" popover="manual" bind:this={tooltipElement}>
        <div class="label">
            {@render tooltip()}
        </div>
    </div>
{/if}

<style>
    button {
        appearance: none;
        -webkit-appearance: none;
        font-family: inherit;
        font-size: inherit;
        padding: 0.2rem;
        height: 2rem;
        display: flex;
        flex-direction: row;
        border: 1px solid transparent;
        background-color: transparent;
        align-items: center;
        box-sizing: border-box;
        gap: 0.2rem;
        user-select: none;

        &.normal {
            color: #000000;
            border-color: #9f9f9f;
            background-color: #ffffff;

            &:hover {
                border-color: #7f7f7f;
                background-color: #efefef;
            }

            &:active {
                border-color: #3f3f3f;
                background-color: #e7e7e7;
            }

            &.toggled {
                color: #ffffff;
                border-color: #9f9f9f;
                background-color: #3f3f3f;
            }

            &:disabled {
                color: #9f9f9f;
                border-color: #dfdfdf;
                background-color: #ffffff;

                &.toggled {
                    color: #9f9f9f;
                    background-color: #7f7f7f;
                }
            }
        }

        &.toolbar {
            color: #000000;
            border-color: transparent;
            background-color: transparent;

            &:hover {
                border-color: #7f7f7f;
                background-color: #0000000f;
            }

            &:active {
                border-color: #3f3f3f;
                background-color: #00000017;
            }

            &.toggled {
                border-color: #7f7f7f;
                background-color: #ffffff;
            }

            &:disabled {
                color: #9f9f9f;
                border-color: transparent;
                background-color: transparent;

                &.toggled {
                    border-color: #9f9f9f;
                    background-color: #ffffff;
                }
            }
        }
    }

    .tooltip {
        margin: 0;
        left: calc(anchor(right) - 1px);
        top: anchor(top);
        padding: 0;
        border: 0;
        width: fit-content;
        user-select: none;
        box-shadow: 0 0 12px #0000000f;

        > .label {
            display: flex;
            flex-direction: row;
            gap: 0.2rem;
            padding: 0.2rem;
            height: 2rem;
            box-sizing: border-box;
            align-items: center;
            border: 1px solid #9f9f9f;
        }
    }
</style>
