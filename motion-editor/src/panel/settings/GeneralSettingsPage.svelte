<script lang="ts">
    import DropDown from "../../component/DropDown.svelte";
    import ListItem from "../../component/ListItem.svelte";
    import TextLabel from "../../component/TextLabel.svelte";
    import { getEditorSession } from "../../editor";
    import { translations } from "../../i18n";
    import type { Settings } from "../../settings";
    import Translation from "../../util/Translation.svelte";

    const editor = getEditorSession();
    const settings = editor.settings;

    function selectLanguage(language: Settings["general"]["language"]) {
        editor.settings.next({
            ...editor.settings.value,
            general: { ...editor.settings.value.general, language },
        });
    }

    function selectClockStyle(clockStyle: Settings["general"]["clockStyle"]) {
        editor.settings.next({
            ...editor.settings.value,
            general: { ...editor.settings.value.general, clockStyle },
        });
    }
</script>

<ListItem>
    {#snippet label()}
        <TextLabel>Language</TextLabel>
    {/snippet}
    {#snippet supporting()}
        <TextLabel>Select app-wide display language</TextLabel>
    {/snippet}
    {#snippet trailing()}
        <DropDown
            selected={$settings.general.language}
            items={["auto", "en-us", "jp", "vi"] satisfies Settings["general"]["language"][]}
            onSelect={selectLanguage}
        >
            {#snippet label(item)}
                {#if item == "auto"}
                    <TextLabel>
                        <Translation key="language.auto" />
                    </TextLabel>
                {:else}
                    <TextLabel>
                        {translations[item]["language.name"]}
                    </TextLabel>
                {/if}
            {/snippet}
        </DropDown>
    {/snippet}
</ListItem>

<ListItem>
    {#snippet label()}
        <TextLabel>Clock nibble style</TextLabel>
    {/snippet}
    {#snippet supporting()}
        <TextLabel>Represent fraction of a second as milliseconds, frames or ticks</TextLabel>
    {/snippet}
    {#snippet trailing()}
        <DropDown selected={$settings.general.clockStyle} items={["ms", "frame", "tick"]} onSelect={selectClockStyle}>
            {#snippet label(item)}
                {#if item == "ms"}
                    <TextLabel>Milliseconds</TextLabel>
                {:else if item == "frame"}
                    <TextLabel>Frames</TextLabel>
                {:else if item == "tick"}
                    <TextLabel>Ticks</TextLabel>
                {/if}
            {/snippet}
        </DropDown>
    {/snippet}
</ListItem>
