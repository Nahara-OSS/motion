<script lang="ts">
    import * as motion from "@nahara/motion";
    import Property from "./Property.svelte";
    import Dropdown from "../input/Dropdown.svelte";
    import { openMenuAt } from "../menu/MenuHost.svelte";
    import type { EditorImpl } from "../../App";

    export let state: any;
    export let editor: EditorImpl;
    const currentScene = editor.sceneStore;
    const currentSelection = editor.selections.objects.selectionStore;
    const seekhead = editor.playback.currentTimeStore;
    let primarySelection: motion.SceneObjectInfo | undefined;
    let properties: motion.IObjectProperty<any>[];

    $: {
        $currentScene;
        primarySelection = $currentSelection?.primary;
        properties = primarySelection?.object.properties ?? [];
    }

    function cast<T>(input: T | undefined): T { return input as T; }

    function handleKeyframeButton(prop: motion.IAnimatable<any>) {
        const now = prop.getKeyframe($seekhead);
        if (now) prop.delete(now);
        else prop.set($seekhead, prop.get($seekhead));
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
                    value={property.get($seekhead)}
                    animatable
                    animating={!!property.animatable.getKeyframe($seekhead)}
                    on:update={e => { cast(property).set($seekhead, e.detail); currentScene.update(a => a); }}
                    on:keyframebutton={() => handleKeyframeButton(property.animatable)}
                />
            {:else if property instanceof motion.EnumObjectProperty}
                <tr class="dropdown">
                    <th scope="row">{property.translationKey}</th>
                    <td><Dropdown label={property.valueTranslator(property.get())} on:click={e => {
                        openMenuAt(e.clientX, e.clientY, [...property.possibleValues].map(v => ({
                            type: "simple",
                            name: property.valueTranslator(v),
                            click: () => {
                                property.set($seekhead, v);
                                currentScene.update(a => a);
                            }
                        })))
                    }} /></td>
                </tr>
            {:else}
                <Property
                    name={property.translationKey}
                    value={property.get($seekhead)}
                    on:update={e => { cast(property).set($seekhead, e.detail); currentScene.update(a => a); }}
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

        tr.dropdown {
            th[scope="row"] {
                font-weight: normal;
                padding: 0;
                padding-left: 8px;
            }

            td {
                padding: 0;
            }
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