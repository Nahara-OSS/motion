#!/usr/env deno
import * as zip from "@mary/zip";
import * as zipDeno from "@mary/zip/deno";

if (import.meta.dirname == null) {
    throw new Error("Build script can only be executed locally");
}

const outputDir = import.meta.dirname + "/build/static";
const minify = true;
const sourcemap = true;

try {
    await Deno.remove(outputDir, { recursive: true });
    console.log("%cinfo %cClean up old build result", "color:green", "");
} catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
}

await Promise.all([
    await Deno.mkdir(outputDir + "/legal/licenses", { recursive: true }),
]);

await Promise.all([
    bundleMain(),
    bundleWorker(),
    extractFont(),
    writeLicenseIndex(),
    copyLanguages(),
    copyLocalLicenses(),
    copyAssets(),
]);

async function bundleMain() {
    await Deno.bundle({
        entrypoints: [import.meta.resolve("./app.html")],
        format: "esm",
        platform: "browser",
        minify,
        sourcemap: sourcemap ? "linked" : undefined,
        outputDir,
    });

    console.log("%cinfo %cFinished bundling main", "color:green", "");
}

async function bundleWorker() {
    await Deno.bundle({
        entrypoints: [import.meta.resolve("./worker/main.ts")],
        format: "esm",
        platform: "browser",
        minify,
        sourcemap: sourcemap ? "linked" : undefined,
        outputPath: outputDir + "/worker.js",
    });

    console.log("%cinfo %cFinished bundling worker", "color:green", "");
}

async function extractFont() {
    using handle = await Deno.open(new URL(import.meta.resolve("./build/fetch/inter-4.1.zip")));
    const reader = await zipDeno.fromFsFile(handle);
    const dstDir = outputDir + "/font/inter";

    for await (const entry of await zip.unzip(reader)) {
        if (!entry.isDirectory && entry.filename == "LICENSE.txt") {
            const content = await entry.bytes();
            await Deno.writeFile(outputDir + "/legal/licenses/inter.txt", content);
            continue;
        }

        if (!entry.isDirectory && entry.filename.match(/^web\//)) {
            const content = await entry.bytes();
            const dstPath = dstDir + "/" + entry.filename;
            const parentPath = dstPath.slice(0, dstPath.lastIndexOf("/"));
            await Deno.mkdir(parentPath, { recursive: true });
            await Deno.writeFile(dstPath, content);
            continue;
        }
    }

    console.log("%cinfo %cFinished extracting font archive", "color:green", "");
}

async function writeLicenseIndex() {
    await Deno.writeTextFile(
        outputDir + "/legal/licenses/index.json",
        JSON.stringify([
            { "name": "Nahara's Motion Editor", "license": "GPL-3.0-or-later", "file": "editor.txt" },
            { "name": "Nahara's Motion Engine", "license": "MIT", "file": "engine.txt" },
            { "name": "Inter", "license": "OFL-1.1", "file": "inter.txt" },
        ]),
    );

    console.log("%cinfo %cWrote license index", "color:green", "");
}

async function copyLanguages() {
    await Deno.mkdir(outputDir + "/lang", { recursive: true });

    for await (const item of Deno.readDir(new URL(import.meta.resolve("./lang/")))) {
        await Deno.copyFile(new URL(item.name, import.meta.resolve("./lang/")), outputDir + "/lang/" + item.name);
    }

    console.log("%cinfo %cCopied language files", "color:green", "");
}

async function copyLocalLicenses() {
    await Promise.all([
        Deno.copyFile(new URL(import.meta.resolve("./LICENSE")), outputDir + "/legal/licenses/editor.txt"),
        Deno.copyFile(new URL(import.meta.resolve("../motion/LICENSE")), outputDir + "/legal/licenses/engine.txt"),
    ]);

    console.log("%cinfo %cCopied local license files", "color:green", "");
}

async function copyAssets() {
    async function copyContent(fromDir: URL, toDir: string) {
        for await (const entry of Deno.readDir(fromDir)) {
            if (entry.isDirectory) {
                await copyContent(new URL(entry.name + "/", fromDir), toDir + "/" + entry.name);
            } else {
                await Deno.copyFile(new URL(entry.name, fromDir), toDir + "/" + entry.name);
            }
        }
    }

    await copyContent(new URL(import.meta.resolve("./assets/")), outputDir);
    console.log("%cinfo %cCopied assets", "color:green", "");
}

console.log("%cinfo %cBuild finished", "color:green", "");
