<script lang="ts">
    import ExplorerPanel from "./ExplorerPanel.svelte";
    import HistoryPanel from "./HistoryPanel.svelte";
    import OutlinePanel from "./OutlinePanel.svelte";
    import type { PanelState } from "./panels";
    import SettingsPanel from "./SettingsPanel.svelte";
    import ViewportPanel from "./ViewportPanel.svelte";

    const {
        state,
        onStateChange,
    }: {
        state: PanelState;
        onStateChange: (updater: (state: PanelState) => PanelState) => unknown;
    } = $props();
</script>

{#if state.type == "explorer"}
    <ExplorerPanel />
{:else if state.type == "history"}
    <HistoryPanel />
{:else if state.type == "outline"}
    <OutlinePanel panelContent={state} onContentChange={(updater) => onStateChange(updater as any)} />
{:else if state.type == "settings"}
    <SettingsPanel panelContent={state} onContentChange={(updater) => onStateChange(updater as any)} />
{:else if state.type == "viewport"}
    <ViewportPanel />
{/if}
