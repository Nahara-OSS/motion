<script lang="ts">
    import type { ISceneContainerObject, SceneObjectInfo } from "@nahara/motion";
    import { createEventDispatcher } from "svelte";
    import type { ObjectsSelection } from "../../appglobal";
    import type { ObjectSelectionImpl } from "../../App";

    export let object: SceneObjectInfo;
    export let selection: ObjectSelectionImpl<SceneObjectInfo>;
    let container: ISceneContainerObject | undefined;
    let selected: boolean;
    let primarySelected: boolean;

    $: container = (object.object as ISceneContainerObject).isContainer
        ? object.object as ISceneContainerObject
        : undefined;
    $: selected = !!selection && selection.multiple.includes(object);
    $: primarySelected = !!selection && selection.primary == object;

    const dispatcher = createEventDispatcher();

    let mouseDown = false;
    let dragging = false;

    function handleMouseDown(e: MouseEvent) {
        dispatcher("selectstart", { multiselect: e.shiftKey || e.ctrlKey, object });
        mouseDown = true;
        dragging = false;
    }

    function handleMouseMove() {
        if (mouseDown && !dragging) {
            dragging = true;
            dispatcher("dragstart", object);
        }
    }

    function handleMouseUpOnOutliner() {
        dispatcher("droponoutliner", object);
    }

    function handleMouseUpInContainer() {
        dispatcher("dropincontainer", object);
    }

    function handleMouseUp(e: MouseEvent) {
        if (!mouseDown) return;
        if (!dragging) dispatcher("select", { multiselect: e.shiftKey || e.ctrlKey, object });
        mouseDown = false;
    }
</script>

<svelte:body on:mouseup={handleMouseUp} on:mousemove={handleMouseMove} />

<div class="outliner" class:selected class:primary-selected={primarySelected}>
    <div
        class="self"
        role="button"
        tabindex="0"
        on:mousedown={handleMouseDown}
        on:mouseup={handleMouseUpOnOutliner}
    >
        <div class="label">{object.name}</div>
        <div class="color-chip" style="--color: {object.color}"></div>
    </div>
    {#if container}
        <div class="children">
            {#if container.objectsCount == 0}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="no-child" on:mouseup={handleMouseUpInContainer}>
                    Empty container. Select this and click "Add" to add something!
                </div>
            {:else}
                {#each [...container].reverse() as child}
                    <div class="child">
                        <svelte:self
                            object={child}
                            {selection}
                            on:select
                            on:dragstart
                            on:droponoutliner
                            on:dropincontainer
                        />
                    </div>
                {/each}
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
    .self {
        display: flex;
        height: 24px;
        border: 1px solid transparent;
        box-sizing: border-box;

        .color-chip {
            width: 24px;
            height: 24px;
            position: relative;

            &::before {
                content: '';
                position: absolute;
                left: 50%; top: 50%;
                translate: -50% -50%;
                width: 8px;
                height: 8px;
                border-radius: 8px;
                background-color: var(--color);
                border: 1px solid #7f7f7f;
            }
        }

        .label {
            padding: 5px 8px;
            flex: 1 1 auto;
        }

        &:hover {
            background-color: #efefef;
        }
    }

    .children {
        .child {
            position: relative;
            margin-left: 24px;

            &::before, &::after {
                content: '';
                position: absolute;
                background-color: #d1d1d1;
            }

            & {
                &::before {
                    width: 1px;
                    height: 100%;
                    left: -12px;
                }

                &::after {
                    width: 12px;
                    height: 1px;
                    left: -12px;
                    top: 12px;
                }
            }

            &:last-child::before { height: 12px; }
        }

        .no-child {
            padding: 5px 24px;
            color: #7f7f7f;
        }
    }

    .outliner:hover {
        > .self {
            border: 1px solid #7f7f7f;
        }

        .child {
            &::before, &::after {
                background-color: #1d1d1d;
            }
        }
    }

    .outliner.selected {
        background-color: #0000000f;
    }

    .outliner.primary-selected > .self {
        background-color: #0000000f;
    }
</style>