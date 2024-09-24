<script lang="ts">
    export let label = "";
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="dropdown" role="button" tabindex="0" on:click>
    <div class="arrow"></div>
    <div class="label">{label}</div>
</div>

<style lang="scss">
    .dropdown {
        display: flex;
        height: 24px;
        box-sizing: border-box;
        border: 1px solid transparent;
        width: fit-content;

        &:hover {
            border: 1px solid #1d1d1d;
        }

        .arrow {
            position: relative;
            width: 24px;
            height: 24px;

            &::before {
                content: '';
                position: absolute;
                border: 4px solid transparent;
                border-bottom: 4px solid #000;
                border-right: 4px solid #000;
                left: 50%;
                top: 50%;
                translate: -50% calc(-50% - 2px);
                rotate: 45deg;
            }
        }

        .label {
            padding: 5px;
        }
    }
</style>