import { EditState, ProjectItemKind, ProjectSource } from "./worker/project.ts";

let source: ProjectSource = {
    metadata: {
        entry: "main.mdj",
    },
    root: {
        "main.mdj": {
            kind: ProjectItemKind.Module,
            content: {
                elementTable: [
                    { kind: "import", module: "builtin:core", name: "number" },
                ],
                exports: {},
            },
        },
    },
};

console.log(EditState.create(source));
