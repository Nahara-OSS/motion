<script lang="ts">
    import * as motion from "@nahara/motion";
    import { app } from "../../appglobal";
    import Property from "./Property.svelte";

    const currentScene = app.currentSceneStore;
    const currentSelection = app.currentSelectionStore;
    const seekhead = app.currentSeekheadStore;
    let primarySelection: motion.SceneObjectInfo | undefined;
    let properties: (motion.IAnimatable<any> | motion.IObjectProperty<any>)[];

    $: {
        $currentScene;
        primarySelection = $currentSelection?.primary;
        properties = primarySelection?.object.properties ?? [];
    }

    function isSimple(prop: motion.IAnimatable<any> | motion.IObjectProperty<any>) {
        return (prop as motion.IObjectProperty<any>).isSimple;
    }

    function castToAnimatable(prop: motion.IAnimatable<any> | motion.IObjectProperty<any>): motion.IAnimatable<any> {
        return prop as motion.IAnimatable<any>;
    }

    function castToSimple(prop: motion.IAnimatable<any> | motion.IObjectProperty<any>): motion.IObjectProperty<any> {
        return prop as motion.IObjectProperty<any>
    }

    function cast<T>(input: T | undefined): T {
        return input as T;
    }

    function handleAnimatablePropertyChange(prop: motion.IAnimatable<any>, newValue: any) {
        if (prop.animated) prop.set($seekhead.position, newValue);
        else prop.defaultValue = newValue;
        currentScene.update(a => a);
    }

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
            {#if isSimple(property)}
                <Property
                    name={property.translationKey}
                    value={castToSimple(property).get()}
                    on:update={e => { castToSimple(property).set(e.detail); currentScene.update(a => a); }}
                />
            {:else}
                <Property
                    name={property.translationKey}
                    value={castToAnimatable(property).get($seekhead.position)}
                    animatable
                    animating={!!castToAnimatable(property).getKeyframe($seekhead.position)}
                    on:update={e => handleAnimatablePropertyChange(castToAnimatable(property), e.detail)}
                    on:keyframebutton={() => handleKeyframeButton(castToAnimatable(property))}
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