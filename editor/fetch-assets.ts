#!/usr/env deno
if (import.meta.dirname == null) {
    throw new Error("Fetch script can only be executed locally");
}

const outputDir = import.meta.dirname + "/build/fetch";
await Deno.mkdir(outputDir, { recursive: true });

interface AssetInfo {
    name: string;
    url: URL;
    sha256: string;
}

const assets: AssetInfo[] = [
    {
        name: "inter-4.1.zip",
        url: new URL("https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip"),
        sha256: "9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e",
    },
];

const fetchResult = await Promise.allSettled(assets.map(fetchAsset));
const failedResults = fetchResult.filter((result) => result.status == "rejected");

if (failedResults.length > 0) {
    for (const result of failedResults) {
        console.error("%cerror", "color:red; font-weight:bold", result.reason);
    }

    throw new Error(`There are ${failedResults.length} failed downloads`);
}

async function fetchAsset(info: AssetInfo): Promise<void> {
    const { name, url, sha256 } = info;
    const dstPath = outputDir + "/" + name;

    try {
        await Deno.lstat(dstPath);
        console.log(`%cskipped %c${name}`, "color:green", "color:gray");
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
            const response = await fetch(url);

            if (!response.ok) {
                const { status, statusText } = response;
                throw new Error(`Error while fetching ${name} from ${url}: ${statusText} (${status})`);
            }

            const content = await response.bytes();
            const expected = Uint8Array.fromHex(sha256);
            const actual = new Uint8Array(await crypto.subtle.digest("SHA-256", content));

            if (!expected.every((b, i) => b == actual[i])) {
                const actualStr = actual.toHex();
                throw new Error(`Checksum failed for ${name}\nExpected ${sha256}\nActual   ${actualStr}`);
            }

            await Deno.writeFile(dstPath, content);
            console.log(`%cfetched %c${name}`, "color:green", "");
        } else {
            throw e;
        }
    }
}
