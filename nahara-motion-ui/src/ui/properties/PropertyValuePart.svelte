<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let color = "#ffffff";
    export let name = "X";
    export let value = 0;

    const dispatcher = createEventDispatcher();
    let dragging = false;
    let oldValue = 0;
    let element: HTMLDivElement;
    let inputElement: HTMLInputElement;
    $: value = Math.round(value * 100) / 100;

    function handleDragStart(e: MouseEvent) {
        dragging = true;
        oldValue = value;
        element.requestPointerLock();
    }

    function handleDrag(e: MouseEvent) {
        if (!dragging) return;
        value += e.movementX * (e.shiftKey ? 0.1 : 1) * (e.ctrlKey ? 10 : 1) * (e.altKey ? 100 : 1);
        dispatcher("update", value);
    }

    function handleDrop(e: MouseEvent) {
        dragging = false;
        document.exitPointerLock();
    }

    function handleWheel(e: WheelEvent) {
        value += e.deltaY > 0 ? 1 : -1;
        dispatcher("update", value);
    }

    function handlePreinput(e: KeyboardEvent) {
        if (e.code == "Enter") {
            e.preventDefault();
            inputElement.blur();
            handleInputDone();
        }
    }

    function handleInput() {
        dispatcher("update", value);
    }

    function handleInputDone() {
        dispatcher("update", value);
    }
</script>

<svelte:body on:mousemove={handleDrag} on:mouseup={handleDrop} />

<div class="part" style="--normal: {color}1f; --hover: {color}5f;" on:wheel={handleWheel} bind:this={element}>
    <div class="name" role="button" tabindex="0" on:mousedown={handleDragStart}>{name}</div>
    <input
        type="number"
        class="value"
        bind:value={value}
        on:keydown={handlePreinput}
        on:input={handleInput}
        bind:this={inputElement}
    >
    <!--<div
        class="value"
        role="textbox"
        tabindex="0"
        contenteditable
        on:keydown={handlePreinput}
        on:input={handleInput}
        on:blur={handleInputDone}
        bind:this={inputElement}
    >{displayValue}</div>-->
</div>

<style lang="scss">
    .part {
        display: flex;
        min-width: 60px;
        height: 24px;
        background-color: var(--normal);
        border: 1px solid transparent;
        box-sizing: border-box;
        white-space: nowrap;

        &:hover, &:active {
            background-color: var(--hover);
            border: 1px solid #1d1d1d;
        }

        .name, .value {
            display: inline-block;
            padding: 5px;
        }

        .name {
            cursor: ew-resize;
            font-weight: bold;
        }

        .value {
            flex: 1 1 auto;
            width: fit-content;
            background-color: unset;
            border: unset;
            field-sizing: content;
            &::-webkit-inner-spin-button { display: none; }
        }
    }
</style>