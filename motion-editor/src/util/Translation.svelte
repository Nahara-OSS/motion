<script lang="ts">
    import { getLanguage, translations, type Language, type TranslationKey } from "../i18n";

    const { key, slot = [] }: { key: string; slot?: readonly string[] } = $props();

    const lang = getLanguage();
    const pack = $derived(translations[lang()] ?? translations["en-us"]);
    const message = $derived(translate(pack[key as TranslationKey], slot));

    function translate(template: string | null, slot: readonly string[]): string | null {
        if (template == null) return null;

        let index = 0;

        return template.replace(/%s/g, (s) => {
            if (s == "%s") {
                const i = index++;
                if (i < slot.length) return slot[i];
            }

            return s;
        });
    }

    if (import.meta.env.DEV) {
        $effect(() => {
            if (message == null) console.warn(`Missing translation: ${key}`);
        });
    }
</script>

{message ?? key}
