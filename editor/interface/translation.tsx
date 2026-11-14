import { type ComponentType, createContext } from "preact";
import type * as protocol from "../protocol.ts";
import { KeyLabel, TextLabel } from "./label.tsx";
import { useContext } from "preact/hooks";

export type Translator = (id: string) => string;
const TranslatorContext = createContext<Translator>((id) => id);

export const TranslationProvider: ComponentType<{ translator: Translator }> = ({ translator, children }) => {
    return (
        <TranslatorContext.Provider value={translator}>
            {children}
        </TranslatorContext.Provider>
    );
};

export function useTranslator(): Translator {
    return useContext(TranslatorContext);
}

export const TranslatedTextLabel: ComponentType<{ tr: string; alt?: boolean }> = ({ alt = false, tr }) => {
    const translator = useTranslator();
    return <TextLabel alt={alt}>{translator(tr)}</TextLabel>;
};

export const TranslatedKeyLabel: ComponentType<{ value: protocol.KeyCombination }> = ({ value }) => {
    const { key, ctrl, alt, shift } = value;
    const translator = useTranslator();

    return (
        <KeyLabel>
            {!ctrl ? null : translator("key.ctrlMod")}
            {!alt ? null : translator("key.altMod")}
            {!shift ? null : translator("key.shiftMod")}
            {translator(key)}
        </KeyLabel>
    );
};

export interface Languages {
    readonly index: Readonly<Record<string, LanguageInfo>>;
    readonly fallback: string;
    readonly onLanguageLoad: (callback: () => void) => () => void;
    readonly translate: (langId: string, tr: string) => string;
}

export interface LanguageInfo {
    readonly intlName: string;
    readonly loclName: string;
    readonly contributors: readonly string[];
}

export async function loadLanguages(fallback: string, preload: readonly string[] = [fallback]): Promise<Languages> {
    if (!preload.includes(fallback)) preload = [...preload, fallback];
    const res = await fetch("./lang/index.json");
    const index: Record<string, LanguageInfo> = await res.json();
    const loaded = new Map<string, ReadonlyMap<string, string>>();
    const loading = new Set<string>();
    const updateHandlers = new Set<() => void>();

    await Promise.allSettled(preload.map(async (langId) => {
        const res = await fetch(`./lang/${langId}.json`);
        const translations: Record<string, string> = await res.json();
        loaded.set(langId, new Map(Object.entries(translations)));
    }));

    return {
        index,
        fallback,

        onLanguageLoad: (callback) => {
            updateHandlers.add(callback);
            return () => updateHandlers.delete(callback);
        },

        translate: (langId, tr) => {
            const translation = loaded.get(langId);

            if (translation == null) {
                if (loading.has(langId)) return tr;
                loading.add(langId);

                fetch(`./lang/${langId}.json`).then(async (res) => {
                    const translations: Record<string, string> = await res.json();
                    loaded.set(langId, new Map(Object.entries(translations)));
                });

                return tr;
            }

            return translation.get(tr) ?? loaded.get(fallback)!.get(tr) ?? tr;
        },
    };
}
