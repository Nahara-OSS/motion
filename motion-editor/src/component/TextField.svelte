<script lang="ts" module>
    export interface ValidateResult {
        readonly level: "info" | "warn" | "error";
        readonly message: string;
    }
</script>

<script lang="ts">
    import { getKeyboardHandler } from "../keyboard";

    import IconLabel from "./IconLabel.svelte";
    import TextLabel from "./TextLabel.svelte";

    let {
        value,
        enabled = true,
        validation = null,
        inputElement = $bindable(null),
        onValueChange,
    }: {
        value: string;
        enabled?: boolean;
        validation?: ValidateResult | null;
        inputElement?: HTMLInputElement | null;
        onValueChange: (value: string) => unknown;
    } = $props();

    let tooltip = $state<HTMLDivElement | null>(null);
    let icon = $state<HTMLDivElement | null>(null);
    let focused = $state(false);

    const keyboard = getKeyboardHandler();

    function showTootip() {
        if (tooltip == null || icon == null) return;
        tooltip.showPopover({ source: icon });
    }

    function hideTooltip() {
        if (tooltip == null) return;
        tooltip.hidePopover();
    }

    $effect(() => {
        if (focused) return keyboard.lock();
    });
</script>

<div class={["text-field", validation?.level ?? "normal"]}>
    <input
        bind:this={inputElement}
        type="text"
        disabled={!enabled}
        {value}
        oninput={(e) => onValueChange(e.currentTarget.value)}
        onfocus={() => (focused = true)}
        onblur={() => (focused = false)}
    />
    {#if validation != null}
        <div
            class="validation-indicator"
            role="button"
            aria-describedby="validation-tooltip"
            tabindex="0"
            onpointerenter={showTootip}
            onpointerleave={hideTooltip}
            bind:this={icon}
        >
            <div class="label">
                <IconLabel type="notice" />
            </div>
        </div>
        <div class="tooltip" id="validation-tooltip" role="tooltip" popover="manual" bind:this={tooltip}>
            <div class="label">
                <TextLabel>{validation.message}</TextLabel>
            </div>
        </div>
    {/if}
</div>

<style>
    .text-field {
        display: flex;
        flex-direction: row;
        height: 2rem;
        border: 1px solid #9f9f9f;
        box-sizing: border-box;

        &:hover {
            border-color: #7f7f7f;
            background-color: #efefef;
        }

        &:active {
            border-color: #3f3f3f;
            background-color: #e7e7e7;
        }

        &:has(> input:disabled) {
            color: #9f9f9f;
            border-color: #dfdfdf;
            background-color: #ffffff;
        }

        > input {
            appearance: none;
            -webkit-appearance: none;
            font-family: inherit;
            font-size: inherit;
            color: inherit;
            border: 0;
            padding: 0;
            outline: none;
            padding-inline: 0.6rem;
            width: 0;
            flex-grow: 1;
            background-color: transparent;
        }

        > .validation-indicator {
            padding: 0.2rem;
            box-sizing: border-box;
            aspect-ratio: 1 / 1;
        }

        &.info {
            border-color: #4fc1ff;
            color: #002d4c;
        }

        &.warn {
            border-color: #ffbc4f;
            background-color: #fff4e0;
            color: #4c2500;
        }

        &.error {
            border-color: #ff4f4f;
            background-color: #ffe0e0;
            color: #4c0000;
        }
    }

    .tooltip {
        position: absolute;
        left: anchor(right);
        top: calc(anchor(top) - 1px);
        pointer-events: none;
        margin: 0;
        box-sizing: border-box;
        padding: 0;
        border: 0;
        box-shadow: 0 0 12px #0000000f;

        > .label {
            display: flex;
            flex-direction: row;
            padding: 0.2rem;
            gap: 0.2rem;
            height: 2rem;
            box-sizing: border-box;
            border: 1px solid #9f9f9f;
            align-items: center;
        }
    }
</style>
