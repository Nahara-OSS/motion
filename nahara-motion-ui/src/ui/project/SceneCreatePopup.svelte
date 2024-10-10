<script lang="ts">
    import type { IProject, Vec2 } from "@nahara/motion";
    import type { EditorImpl } from "../../App";
    import Property from "../properties/Property.svelte";
    import Button from "../input/Button.svelte";
    import { closePopup } from "../popup/PopupHost.svelte";

    export let editor: EditorImpl;
    export let project: IProject;
    let sceneName = "New scene";
    let resolution: Vec2 = { x: 1920, y: 1080 };

    async function confirm() {
        const newScene = await project.newScene({ name: sceneName, size: resolution });
        editor.projectStore.update(a => a);
        editor.openScene(newScene);
        closePopup();
    }
</script>

<table>
    <Property name="Scene name" value={sceneName} on:update={e => sceneName = e.detail} />
    <Property name="Resolution" value={resolution} on:update={e => resolution = e.detail} />
    <tr>
        <td></td>
        <td><Button label="Confirm" on:click={confirm} /></td>
    </tr>
</table>

<style lang="scss">
    table {
        border-spacing: 0;

        tr, td {
            padding: 0;
        }
    }
</style>