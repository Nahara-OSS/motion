import * as annotation from "./annotation.ts";
import * as runtime from "./runtime.ts";

export type Debuggable =
    | runtime.Element
    | runtime.Type
    | string
    | number;

export function dbg(strings: readonly string[], ...symbols: readonly Debuggable[]): string {
    const s: string[] = [strings[0]];

    for (let i = 1; i < strings.length; i++) {
        s.push(dbgName(symbols[i - 1]));
        s.push(strings[i]);
    }

    return s.join("");
}

export function dbgName(target: Debuggable): string {
    if (target instanceof runtime.Element) {
        const debugInfo = target.annotations.find((a) => a.name == "debug");
        const editorInfo = target.annotations.find((a) => a.name == "editor");

        if (debugInfo?.entries.name.type == annotation.AnnotationType.String) {
            return debugInfo.entries.name.value;
        }

        if (editorInfo?.entries.name.type == annotation.AnnotationType.String) {
            const x = editorInfo.entries.name.value;
            return `[${x}]`;
        }

        if (target instanceof runtime.Struct) {
            const fields = Object
                .entries(target.fields)
                .map(([name, { fieldType }]) => `${name}: ${dbgName(fieldType)}`)
                .join("; ");
            return `struct { ${fields} }`;
        }

        if (target instanceof runtime.Variant) {
            const options = Object
                .entries(target.options)
                .map(([name, { dataType }]) => dataType == null ? name : `${name} => ${dbgName(dataType)}`)
                .join("; ");
            return `variant { ${options} }`;
        }

        return `<${target.elementTypeName}>`;
    }

    if (target instanceof runtime.ConcreteType) {
        const decl = dbgName(target.declaration);
        const params = target.typeParams.length == 0 ? "" : `<${target.typeParams.map(dbgName).join(", ")}>`;
        return `${decl}${params}`;
    }

    if (target instanceof runtime.TypeParameter) {
        const debugInfo = target.annotations.find((a) => a.name == "debug");
        const editorInfo = target.annotations.find((a) => a.name == "editor");

        if (debugInfo?.entries.name.type == annotation.AnnotationType.String) {
            return debugInfo.entries.name.value;
        }

        if (editorInfo?.entries.name.type == annotation.AnnotationType.String) {
            const x = editorInfo.entries.name.value;
            return `[${x}]`;
        }

        return "?";
    }

    if (typeof target == "number") return `#${target}`;
    if (typeof target == "string") return `'${target}'`;
    return `${target}`;
}
