import type { ComponentType } from "preact";
import * as protocol from "../protocol.ts";
import { IconLabel, TextLabel } from "./label.tsx";
import { TranslatedTextLabel } from "./translation.tsx";

export const ProjectLabel: ComponentType<{ name: string | null }> = ({ name }) => {
    return (
        <>
            <IconLabel type="nahara-motion" />
            {name != null ? <TextLabel>{name}</TextLabel> : <TranslatedTextLabel tr="unnamedProject" />}
        </>
    );
};

export const ElementLabel: ComponentType<{
    kind: protocol.ElementKind;
    subtype: string | null;
    name: string | null;
}> = ({
    kind,
    subtype,
    name,
}) => {
    switch (kind) {
        case protocol.ElementKind.Type:
        case protocol.ElementKind.Struct:
        case protocol.ElementKind.Variant: {
            return (
                <>
                    <IconLabel type="type" />
                    {name != null ? <TextLabel>{name}</TextLabel> : <TranslatedTextLabel tr="unnamedType" />}
                </>
            );
        }

        case protocol.ElementKind.Function: {
            return (
                <>
                    <IconLabel type="function" />
                    {name != null ? <TextLabel>{name}</TextLabel> : <TranslatedTextLabel tr="unnamedFunction" />}
                </>
            );
        }

        case protocol.ElementKind.Component: {
            switch (subtype) {
                case "scene": {
                    return (
                        <>
                            <IconLabel type="scene" />
                            {name != null ? <TextLabel>{name}</TextLabel> : <TranslatedTextLabel tr="unnamedScene" />}
                        </>
                    );
                }
            }

            return (
                <>
                    <IconLabel type="component" />
                    {name != null ? <TextLabel>{name}</TextLabel> : <TranslatedTextLabel tr="unnamedComponent" />}
                </>
            );
        }
    }
};
