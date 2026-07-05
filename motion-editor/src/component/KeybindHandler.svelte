<!--
@component
Capture key combinations and call the callback.
-->

<script lang="ts">
    import { getKeyboardHandler, type KeyCombination } from "../keyboard";

    const {
        keys,
        enabled = true,
        onKeyDown,
        onKeyUp,
    }: {
        /**
         * List of all possible key combinations this component should be capturing.
         */
        keys: readonly KeyCombination[];

        /**
         * Enable key combinations handling.
         */
        enabled?: boolean;

        onKeyDown?: (e: KeyboardEvent) => unknown;
        onKeyUp?: (e: KeyboardEvent) => unknown;
    } = $props();

    const keyboard = getKeyboardHandler();

    $effect(() => {
        if (enabled) {
            return keyboard.register(keys, {
                keydown: onKeyDown ?? (() => {}),
                keyup: onKeyUp ?? (() => {}),
            });
        }
    });
</script>
