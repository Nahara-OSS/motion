<script lang="ts">
    export let title: string;
</script>

<div class="popup">
    <div class="titlebar">
        <div class="title">{title}</div>
    </div>
    <div class="content"><slot /></div>
</div>

<style lang="scss">
    .popup {
        display: flex;
        background-color: #fff;
        flex-direction: column;
        border: 1px solid #d1d1d1;

        &:hover {
            border: 1px solid #1d1d1d;
        }

        .title {
            padding: 10px;
            background-color: #efefef;
        }
    }
</style>