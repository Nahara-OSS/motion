<script lang="ts">
    import { getLanguage, translations, type Language, type TranslationKey } from "../i18n";

    const { key }: { key: string } = $props();

    const lang = getLanguage();
    const pack = $derived(translations[lang()] ?? translations["en-us"]);
    const message = $derived(pack[key as TranslationKey]);

    if (import.meta.env.DEV) {
        $effect(() => {
            if (message == null) console.warn(`Missing translation: ${key}`);
        });
    }
</script>

{message ?? key}
