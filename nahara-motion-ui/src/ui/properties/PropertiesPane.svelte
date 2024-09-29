<script lang="ts">
    import * as motion from "@nahara/motion";
    import { app } from "../../appglobal";
    import Property from "./Property.svelte";

    const currentScene = app.currentSceneStore;
    const currentSelection = app.currentSelectionStore;
    const seekhead = app.currentSeekheadStore;
    let primarySelection: motion.SceneObjectInfo | undefined;
    let properties: motion.IObjectProperty<any>[];

    $: {
        $currentScene;
        primarySelection = $currentSelection?.primary;
        properties = primarySelection?.object.properties ?? [];
    }

    function cast<T>(input: T | undefined): T { return input as T; }

    function handleKeyframeButton(prop: motion.IAnimatable<any>) {
        const now = prop.getKeyframe($seekhead.position);
        if (now) prop.delete(now);
        else prop.set($seekhead.position, prop.get($seekhead.position));
        currentScene.update(a => a);
    }
</script>

{#if primarySelection}
    <table>
        <tr>
            <th scope="col" style:width="80px" style:padding-left="8px">Property</th>
            <th scope="col">Value</th>
            <th scope="col" style:width="24px"></th>
        </tr>
        <Property
            name="label"
            value={primarySelection.name}
            on:update={e => { cast(primarySelection).name = e.detail; currentScene.update(a => a); }}
        />
        <Property
            name="startTime"
            value={primarySelection.timeStart}
            on:update={e => { cast(primarySelection).timeStart = e.detail; currentScene.update(a => a); }}
        />
        <Property
            name="endTime"
            value={primarySelection.timeEnd}
            on:update={e => { cast(primarySelection).timeEnd = e.detail; currentScene.update(a => a); }}
        />
        {#each properties as property}
            {#if property instanceof motion.AnimatableObjectProperty}
                <Property
                    name={property.translationKey}
                    value={property.get($seekhead.position)}
                    animatable
                    animating={!!property.animatable.getKeyframe($seekhead.position)}
                    on:update={e => { cast(property).set($seekhead.position, e.detail); currentScene.update(a => a); }}
                    on:keyframebutton={() => handleKeyframeButton(property.animatable)}
                />
            {:else}
                <Property
                    name={property.translationKey}
                    value={property.get($seekhead.position)}
                    on:update={e => { cast(property).set($seekhead.position, e.detail); currentScene.update(a => a); }}
                />
            {/if}
        {/each}
    </table>
{:else}
    <div class="placeholder">Select an object to view its properties!</div>
{/if}

<style lang="scss">
    table {
        width: 100%;
        table-layout: fixed;
        border-spacing: 0;
        padding: 0;

        th {
            padding: 0;
            text-align: left;
        }

        tr {
            height: 24px;
        }
    }

    .placeholder {
        color: #7f7f7f;
        padding: 5px 8px;
    }
</style>