import * as motion from "@nahara/motion";
import * as editor from "@nahara/motion-editor";
import * as pkg from "@nahara/motion-package";

let state = await editor.EditState.create(
    {
        metadata: {
            entry: "./main.bin",
        },
        root: {
            "main.bin": editor.ProjectItem.module({
                elementTable: [
                    {
                        kind: motion.model.ElementKind.Component,
                        annotations: [],
                        typeParams: [],
                        parameters: {},
                        slots: {},
                        content: [],
                    },
                ],
                exports: {},
            }),
        },
    },
    new pkg.Resolver({
        registries: [],
    }),
);

console.log(state);
