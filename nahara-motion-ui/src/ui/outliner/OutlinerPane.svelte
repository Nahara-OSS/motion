<script lang="ts">
    import { app } from "../../appglobal";
    import Button from "../input/Button.svelte";
    import MenuHost, { openMenuAt } from "../menu/MenuHost.svelte";
    import * as motion from "@nahara/motion";
    import Outliner from "./Outliner.svelte";

    export let state: any;
    const currentScene = app.currentSceneStore;
    const selection = app.currentSelectionStore;

    function findContainer(object?: motion.SceneObjectInfo): motion.IObjectContainer {
        if (!object) return $currentScene!;

        if ((object.object as motion.ISceneContainerObject).isContainer) {
            return object.object as motion.ISceneContainerObject;
        }

        // Build tree
        const objectToParent: Map<motion.SceneObjectInfo, motion.IObjectContainer> = new Map();

        function buildTree(container: motion.IObjectContainer) {
            for (const object of container) {
                objectToParent.set(object, container);

                if ((object.object as motion.ISceneContainerObject).isContainer) {
                    buildTree(object.object as motion.ISceneContainerObject);
                }
            }
        }

        buildTree($currentScene!);
        return objectToParent.get(object) ?? $currentScene!;
    }

    function findParentOf(
        object: motion.SceneObjectInfo,
        container: motion.IObjectContainer = $currentScene!
    ): motion.IObjectContainer | null {
        if (container.indexOf(object) != -1) return container;

        for (const obj of container) {
            if ((obj.object as motion.ISceneContainerObject).isContainer)
                return findParentOf(object, obj.object as motion.ISceneContainerObject);
        }

        return null;
    }

    function findParentFromData(
        object: motion.ISceneObject,
        container: motion.IObjectContainer = $currentScene!
    ): motion.IObjectContainer | null {
        for (const obj of container) {
            if (obj.object == object) return container;
            if ((obj.object as motion.ISceneContainerObject).isContainer)
                return findParentFromData(object, obj.object as motion.ISceneContainerObject);
        }

        return null;
    }

    function isRecursive(target: motion.SceneObjectInfo, container: motion.IObjectContainer = $currentScene!) {
        // Dropping container to itself
        if ((target.object as any) == container) return true;

        // Dropping outer container (target) to inner container (container)
        if ((container as motion.ISceneContainerObject).isContainer) {
            const parent = findParentFromData(container as motion.ISceneContainerObject);
            if (parent && isRecursive(target, parent)) return true;
        }

        return false;
    }

    function handleAddButton(e: MouseEvent) {
        openMenuAt(e.clientX, e.clientY, app.createAddObjectMenu(type => {
            if (!$currentScene) return;
            const obj = motion.objects.createNew(type, 0, 1000);
            findContainer($selection?.primary).add(obj);
            currentScene.update(a => a);
            app.selectSingle(obj);
        }));
    }

    function handleDeleteButton(e: MouseEvent) {
        if (!$selection || !$currentScene) return;
        removeEntirelyFromContainer($selection.multiple, $currentScene);
        currentScene.update(a => a);
        app.deselectAll();
    }

    function handleSelect(e: CustomEvent, selectStart: boolean) {
        const object: motion.SceneObjectInfo = e.detail.object;
        const multiselect: boolean = e.detail.multiselect || (selectStart && $selection?.multiple.includes(object));

        if (multiselect) app.selectMulti(object, false);
        else app.selectSingle(object);
    }

    let draggingOulinerHandle = false;

    function handleOutlinerHandleDragStart() {
        draggingOulinerHandle = true;
    }

    function handleOutlinerHandleDropOnOutliner(target: motion.SceneObjectInfo) {
        if (!draggingOulinerHandle) return;
        draggingOulinerHandle = false;

        if (!$selection || !$currentScene) return;
        const toContainer = findParentOf(target) ?? $currentScene;
        const objects = [...$selection.multiple].filter(o => !isRecursive(o, toContainer) && o != target);
        removeEntirelyFromContainer(objects, $currentScene);
        app.deselectAll();
        const insertIdx = toContainer.indexOf(target);
        if (insertIdx == -1) return; // ???

        for (const obj of objects) {
            toContainer.add(insertIdx + 1, obj);
            app.selectMulti(obj);
        }

        currentScene.update(a => a);
    }

    function handleOutlinerHandleDropInContainer(target: motion.SceneObjectInfo) {
        if (!draggingOulinerHandle) return;
        draggingOulinerHandle = false;
        
        const container = target.object as motion.ISceneContainerObject;
        if (!container.isContainer) return;

        if (!$selection || !$currentScene) return;
        const objects = [...$selection.multiple].filter(o => !isRecursive(o, container));
        removeEntirelyFromContainer(objects, $currentScene);    
        app.deselectAll();

        for (const obj of objects) {
            container.add(0, obj);
            app.selectMulti(obj);
        }

        currentScene.update(a => a);
    }

    function handleOutlinerHandleDropOutsideOutliner() {
        if (!draggingOulinerHandle) return;
        draggingOulinerHandle = false;

        if (!$selection || !$currentScene) return;
        const objects = [...$selection.multiple];
        removeEntirelyFromContainer(objects, $currentScene);
        app.deselectAll();

        for (const obj of objects) {
            $currentScene.add(0, obj);
            app.selectMulti(obj);
        }

        currentScene.update(a => a);
    }

    function removeEntirelyFromContainer(objects: motion.SceneObjectInfo[], container: motion.IObjectContainer) {
        for (const object of objects) {
            const idx = container.indexOf(object);
            if (idx != -1) container.remove(idx);
        }

        for (const object of container) {
            if ((object.object as motion.ISceneContainerObject).isContainer)
                removeEntirelyFromContainer(objects, object.object as motion.ISceneContainerObject);
        }
    }
</script>

<svelte:body
    on:mouseup={handleOutlinerHandleDropOutsideOutliner}
/>

{#if $currentScene}
    <div class="buttons">
        <Button label="Add" keys={["Shift", "A"]} on:click={handleAddButton} />
        <Button label="Delete" keys={["Del"]} disabled={!$selection} on:click={handleDeleteButton} />
    </div>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="objects" on:mouseup|self={() => { if (!draggingOulinerHandle) app.deselectAll(); }}>
        {#each [...$currentScene].reverse() as object}
            <Outliner
                {object}
                selection={$selection}
                on:selectstart={e => handleSelect(e, true)}
                on:select={e => handleSelect(e, false)}
                on:dragstart={handleOutlinerHandleDragStart}
                on:droponoutliner={e => handleOutlinerHandleDropOnOutliner(e.detail)}
                on:dropincontainer={e => handleOutlinerHandleDropInContainer(e.detail)}
            />
        {/each}
    </div>
{:else}
    <div></div>
{/if}

<style lang="scss">
    .buttons {
        display: flex;
        padding: 5px;

        > :global(*) {
            margin: 0 4px 0 0;
        }
    }

    .objects {
        height: calc(100% - 34px);
        overflow-y: scroll;
        border-top: 1px solid #d1d1d1;
        box-sizing: border-box;

        &::-webkit-scrollbar { display: none; }
    }
</style>