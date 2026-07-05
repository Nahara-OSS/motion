<script lang="ts">
    import TextLabel from "../component/TextLabel.svelte";
    import Translation from "../util/Translation.svelte";
    import type { PanelState } from "./panels";

    const { state }: { state: PanelState } = $props();
</script>

<TextLabel>
    <Translation key="window.{state.type}" />
</TextLabel>
