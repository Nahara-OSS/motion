import { createContext } from "svelte";
import enUS from "./assets/lang/en-us.json" with { type: "json" };
import vi from "./assets/lang/vi.json" with { type: "json" };
import jp from "./assets/lang/jp.json" with { type: "json" };

export type Translation = typeof enUS;
export type TranslationKey = keyof typeof enUS;
export type Language = keyof typeof translations;

export const [getLanguage, setLanguage] = createContext<() => Language>();

export const translations = {
    // Base for all languages
    "en-us": enUS as Translation,

    // Ordered by alphabet
    "jp": { ...enUS, ...jp } as Translation,
    "vi": { ...enUS, ...vi } as Translation,
};
