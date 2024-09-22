<script lang="ts">
    export let label: string = "";
    export let keys: string[] = [];
    export let disabled = false;
</script>

<button type="button" class="token-button-normal" {disabled} on:click>
    {label}
    {#each keys as key}
        <div class="key">{key}</div>
    {/each}
</button>

<style lang="scss">
    button {
        position: relative;

        .key {
            display: inline-block;
            background-color: #efefef;
            font-size: 8px;
            padding: 2px 5px;
            vertical-align: top;
            border: 1px solid #d1d1d1;
            margin-top: -1px;
            box-sizing: border-box;
            box-shadow: 0 2px #d1d1d1;
            margin-left: 4px;
        }

        &:hover .key {
            border: 1px solid #1d1d1d;
            box-shadow: 0 2px #1d1d1d;
        }

        &:disabled {
            border: 1px solid #d1d1d1;
            background-color: #efefef;
            box-shadow: unset;

            .key {
                border: 1px solid #d1d1d1;
                box-shadow: 0 2px #d1d1d1;
            }

            &::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background:
                linear-gradient(to bottom right, #0000 48%, #d1d1d1 49%, #d1d1d1 50%, #d1d1d1 51%, #0000 52%),
                linear-gradient(to bottom left, #0000 48%, #d1d1d1 49%, #d1d1d1 50%, #d1d1d1 51%, #0000 52%);
            }
        }
    }
</style>