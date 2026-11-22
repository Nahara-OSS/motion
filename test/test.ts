import * as motion from "@nahara/motion";
import { assertEquals } from "@std/assert/equals";

Deno.test("Loader test", async () => {
    let slotCounter = 0;
    let testCounter = 0;

    const { exports: { Scene } } = motion.loader.loadModule({
        source: {
            elementTable: [
                {
                    kind: motion.model.ElementKind.ImportElement,
                    module: "builtin:test",
                    name: "Test",
                },
                {
                    kind: motion.model.ElementKind.Component,
                    annotations: [],
                    typeParams: [],
                    parameters: {},
                    slots: {
                        children: {
                            annotations: [],
                            inputs: [],
                        },
                    },
                    content: [
                        {
                            type: motion.model.ComponentChildType.Object,
                            componentOrdinal: 0,
                            typeParams: [],
                            parameters: {},
                            slots: {},
                        },
                        {
                            type: motion.model.ComponentChildType.UseSlot,
                            slot: "children",
                            inputs: [],
                        },
                        {
                            type: motion.model.ComponentChildType.Object,
                            componentOrdinal: 0,
                            typeParams: [],
                            parameters: {},
                            slots: {},
                        },
                    ],
                },
            ],
            exports: {
                Scene: 1,
            },
        },
        resolve: (module, name) => {
            if (module != "builtin:test" && name != "Test") throw new Error(`Only support builtin:test/Test`);
            return new (class extends motion.runtime.Component {
                override annotations: readonly motion.annotation.Annotation[] = [];
                override typeParams: readonly motion.runtime.TypeParameter[] = [];
                override parameters: Readonly<Record<string, motion.runtime.Parameter>> = {};
                override slots: Readonly<Record<string, motion.runtime.Slot>> = {};

                // deno-lint-ignore require-await
                override async render(): Promise<void> {
                    testCounter++;
                }
            })();
        },
        asset: () => {
            throw new Error(`Asset is not supported`);
        },
    });

    await (Scene as motion.runtime.Component).render(
        [],
        motion.context.ContextMap.EMPTY,
        {},
        {
            // deno-lint-ignore require-await
            children: async () => {
                slotCounter++;
            },
        },
    );

    assertEquals(slotCounter, 1);
    assertEquals(testCounter, 2);
});
