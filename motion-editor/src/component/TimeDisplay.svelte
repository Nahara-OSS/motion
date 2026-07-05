<!--
@component
Time display component for displaying current scene time.
-->

<script lang="ts">
    const {
        whole,
        nibbleName,
        nibble,
        onClick,
    }: {
        /**
         * Whole value.
         *
         * Whole value like HH:MM:SS.
         */
        whole: string;

        /**
         * Nibble name.
         *
         * Nibble is like "fraction" of the time value, like milliseconds, ticks or frames.
         */
        nibbleName: string;

        /**
         * Nibble value.
         *
         * Nibble is like "fraction" of the time value, like milliseconds, ticks or frames.
         */
        nibble: string;

        /**
         * Click event listener.
         *
         * Called when user clicked on time display component. Typically used for changing the display mode of time
         * display.
         */
        onClick?: (e: MouseEvent & { currentTarget: HTMLButtonElement }) => unknown;
    } = $props();
</script>

<button type="button" class="time-display" onclick={onClick}>
    <div class="whole">{whole}</div>
    <div class="nibble">
        <div class="name">{nibbleName}</div>
        <div class="value">{nibble}</div>
    </div>
</button>

<style>
    .time-display {
        appearance: none;
        -webkit-appearance: none;
        font-family: inherit;
        font-size: inherit;
        border: 0;
        background-color: transparent;
        text-align: left;
        display: flex;
        flex-direction: row;
        font-feature-settings: "zero", "tnum", "ss01";
        align-content: center;
        height: 3rem;
        padding-inline: 0.6rem;
        padding-block: 0.5rem;
        gap: 0.2rem;
        box-sizing: border-box;

        &:hover {
            background-color: #0000000f;
        }

        &:active {
            background-color: #00000017;
        }

        > .whole {
            font-size: 2rem;
            font-weight: bold;
            height: 2rem;
            line-height: 1;
        }

        > .nibble {
            display: flex;
            flex-direction: column;

            > .name,
            > .value {
                height: 1rem;
            }

            > .name {
                font-size: 0.8rem;
                color: #3f3f3f;
            }

            > .value {
                line-height: 0.8;
                font-weight: bold;
            }
        }
    }
</style>
