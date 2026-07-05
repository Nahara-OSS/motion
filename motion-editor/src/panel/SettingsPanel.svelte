<script lang="ts">
    import Button from "../component/Button.svelte";
    import Panel from "../component/Panel.svelte";
    import TextLabel from "../component/TextLabel.svelte";
    import type { PanelMap } from "./panels";
    import AccessiblitySettingsPage from "./settings/AccessiblitySettingsPage.svelte";
    import GeneralSettingsPage from "./settings/GeneralSettingsPage.svelte";
    import KeybindSettingsPage from "./settings/KeybindSettingsPage.svelte";

    const {
        panelContent,
        onContentChange,
    }: {
        panelContent: PanelMap["settings"];
        onContentChange: (updater: (content: PanelMap["settings"]) => PanelMap["settings"]) => unknown;
    } = $props();
</script>

<Panel>
    <div class="content">
        <div class="categories">
            <Button
                style="toolbar"
                toggled={panelContent.category == "general"}
                onClick={() => onContentChange((c) => ({ ...c, category: "general" }))}
            >
                <TextLabel>General</TextLabel>
            </Button>
            <Button
                style="toolbar"
                toggled={panelContent.category == "accessiblity"}
                onClick={() => onContentChange((c) => ({ ...c, category: "accessiblity" }))}
            >
                <TextLabel>Accessiblity</TextLabel>
            </Button>
            <Button
                style="toolbar"
                toggled={panelContent.category == "keybinds"}
                onClick={() => onContentChange((c) => ({ ...c, category: "keybinds" }))}
            >
                <TextLabel>Keybinds</TextLabel>
            </Button>
        </div>
        <div class="separator"></div>
        <div class="settings">
            {#if panelContent.category == "general"}
                <GeneralSettingsPage />
            {:else if panelContent.category == "accessiblity"}
                <AccessiblitySettingsPage />
            {:else if panelContent.category == "keybinds"}
                <KeybindSettingsPage />
            {/if}
        </div>
    </div>
</Panel>

<style>
    .content {
        display: flex;
        flex-direction: row;
        width: 100%;
        height: 100%;

        > .categories {
            display: flex;
            flex-direction: column;
            width: 16rem;
            gap: 0.2rem;
            padding: 0.5rem;
            box-sizing: border-box;
        }

        > .separator {
            width: 1px;
            background-color: #dfdfdf;
        }

        > .settings {
            width: 0;
            flex-grow: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
    }
</style>
