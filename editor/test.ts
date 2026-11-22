import { assertEquals, assertThrows } from "@std/assert";
import { HistoryStack } from "./history.ts";
import { resolvePath } from "./internal.ts";
import { ItemType, ProjectFolderItem, ProjectItem } from "./project.ts";

Deno.test.each<[string[], string[]]>([
    [[], []],
    [[".."], []],
    [["./main.bin", "..", "./asset.png"], ["asset.png"]],
    [["./modules/main.bin", "..", "/asset.png"], ["asset.png"]],
    [["./modules/main.bin", "..", "./components.bin"], ["modules", "components.bin"]],
])("resolve path [%s] => [%s]", (input, expected) => {
    const actual = resolvePath(...input);
    assertEquals(actual, expected);
});

Deno.test("project folder", async (t) => {
    const assetA = new Blob(["A"]);
    const assetB = new Blob(["BB"]);
    const assetC = new Blob(["CCC"]);

    let root: ProjectFolderItem = ProjectItem.folder({
        main: ProjectItem.module({ elementTable: [], exports: {} }),
        assets: ProjectItem.folder({
            assetA: ProjectItem.asset(assetA),
            assetB: ProjectItem.asset(assetB),
        }),
    });

    await t.step("update asset", () => {
        assertEquals(
            root = ProjectFolderItem.update(root, ["assets", "assetA"], (x) => {
                if (x.type != ItemType.Asset) return x;
                return { ...x, source: assetC };
            }),
            ProjectItem.folder({
                main: ProjectItem.module({ elementTable: [], exports: {} }),
                assets: ProjectItem.folder({
                    assetA: ProjectItem.asset(assetC),
                    assetB: ProjectItem.asset(assetB),
                }),
            }),
        );
    });

    await t.step("delete asset", () => {
        assertEquals(
            root = ProjectFolderItem.delete(root, ["assets", "assetB"]),
            ProjectItem.folder({
                main: ProjectItem.module({ elementTable: [], exports: {} }),
                assets: ProjectItem.folder({
                    assetA: ProjectItem.asset(assetC),
                }),
            }),
        );
    });

    await t.step("delete folder", () => {
        assertEquals(
            root = ProjectFolderItem.delete(root, ["assets"]),
            ProjectItem.folder({
                main: ProjectItem.module({ elementTable: [], exports: {} }),
            }),
        );
    });

    await t.step("create asset", () => {
        assertEquals(
            root = ProjectFolderItem.set(root, ["file"], ProjectItem.asset(assetA)),
            ProjectItem.folder({
                main: ProjectItem.module({ elementTable: [], exports: {} }),
                file: ProjectItem.asset(assetA),
            }),
        );
    });
});

Deno.test("history stack", async (t) => {
    let history = HistoryStack.create("Load", "Hello");

    assertEquals(history, {
        current: { label: "Load", snapshot: "Hello" },
        undoStack: [],
        redoStack: [],
    });

    await t.step("push", () => {
        assertEquals(history = HistoryStack.push(history, "Insert text", (x) => x + " world!"), {
            current: { label: "Insert text", snapshot: "Hello world!" },
            undoStack: [
                { label: "Load", snapshot: "Hello" },
            ],
            redoStack: [],
        });

        assertEquals(history = HistoryStack.push(history, "Delete text", (x) => x.substring(0, 5)), {
            current: { label: "Delete text", snapshot: "Hello" },
            undoStack: [
                { label: "Load", snapshot: "Hello" },
                { label: "Insert text", snapshot: "Hello world!" },
            ],
            redoStack: [],
        });

        assertEquals(history = HistoryStack.push(history, "Insert text", (x) => x + " there!"), {
            current: { label: "Insert text", snapshot: "Hello there!" },
            undoStack: [
                { label: "Load", snapshot: "Hello" },
                { label: "Insert text", snapshot: "Hello world!" },
                { label: "Delete text", snapshot: "Hello" },
            ],
            redoStack: [],
        });
    });

    await t.step("undo", () => {
        assertEquals(history = HistoryStack.undo(history, 1), {
            current: { label: "Delete text", snapshot: "Hello" },
            undoStack: [
                { label: "Load", snapshot: "Hello" },
                { label: "Insert text", snapshot: "Hello world!" },
            ],
            redoStack: [
                { label: "Insert text", snapshot: "Hello there!" },
            ],
        });

        assertEquals(history = HistoryStack.undo(history, 2), {
            current: { label: "Load", snapshot: "Hello" },
            undoStack: [],
            redoStack: [
                { label: "Insert text", snapshot: "Hello there!" },
                { label: "Delete text", snapshot: "Hello" },
                { label: "Insert text", snapshot: "Hello world!" },
            ],
        });

        assertThrows(() => {
            history = HistoryStack.undo(history, 1);
        });
    });

    await t.step("redo", () => {
        assertEquals(history = HistoryStack.redo(history, 2), {
            current: { label: "Delete text", snapshot: "Hello" },
            undoStack: [
                { label: "Load", snapshot: "Hello" },
                { label: "Insert text", snapshot: "Hello world!" },
            ],
            redoStack: [
                { label: "Insert text", snapshot: "Hello there!" },
            ],
        });

        assertThrows(() => {
            history = HistoryStack.redo(history, 2);
        });
    });

    await t.step("push (on 1 undo entry)", () => {
        assertEquals(history = HistoryStack.push(history, "Override text", () => "Goodbye!"), {
            current: { label: "Override text", snapshot: "Goodbye!" },
            undoStack: [
                { label: "Load", snapshot: "Hello" },
                { label: "Insert text", snapshot: "Hello world!" },
                { label: "Delete text", snapshot: "Hello" },
            ],
            redoStack: [],
        });
    });
});
