import type * as motion from "@nahara/motion";
import { SIGNATURE, VERSION } from "./constant.ts";
import { readAligned, TagCodec, writeAligned } from "./stream.ts";
import { type ModulePart, PartType, readModulePart, writeModulePart } from "./part.ts";

const headerSize = SIGNATURE.byteLength + Uint32Array.BYTES_PER_ELEMENT;

export async function readModule(
    stream: ReadableStream<Uint8Array> | ReadableStreamBYOBReader,
    tag: TagCodec = new TagCodec(),
    utf8: TextDecoder = new TextDecoder(),
): Promise<motion.model.Module> {
    const reader = stream instanceof ReadableStreamBYOBReader ? stream : stream.getReader({ mode: "byob" });
    const borrowingReader = stream instanceof ReadableStreamBYOBReader;

    try {
        const header = await readAligned(reader, headerSize);
        const headerView = new DataView(header.buffer);
        const signature = new Uint8Array(header.buffer, 0, SIGNATURE.byteLength);
        const version = headerView.getUint32(SIGNATURE.byteLength, true);

        if (!(signature.every((b, i) => b == SIGNATURE[i]))) {
            reader.releaseLock();
            throw new Error(`Signature mismatch: 0x${signature.toHex()} != 0x${SIGNATURE.toHex()}`);
        }

        if (version > VERSION) {
            reader.releaseLock();
            throw new Error(`Unsupported version: ${version} (current format parser only support up to ${VERSION})`);
        }

        const elementTable: motion.model.Element[] = [];
        const exports: (readonly [string, number])[] = [];
        let part: ModulePart;

        while ((part = await readModulePart(reader, tag, utf8)).type != PartType.End) {
            switch (part.type) {
                case PartType.Export: {
                    const { ordinal, name } = part;
                    exports.push([name, ordinal]);
                    break;
                }

                case PartType.Declare: {
                    const { element } = part;
                    elementTable.push(element);
                    break;
                }
            }
        }

        return { elementTable, exports: Object.fromEntries(exports) };
    } finally {
        if (!borrowingReader) {
            reader.releaseLock();
        }
    }
}

export async function writeModule(
    stream: WritableStream<Uint8Array>,
    source: motion.model.Module,
    tag: TagCodec = new TagCodec(),
    utf8: TextEncoder = new TextEncoder(),
): Promise<void> {
    const writer = stream instanceof WritableStreamDefaultWriter ? stream : stream.getWriter();
    const borrowingWriter = stream instanceof WritableStreamDefaultWriter;

    try {
        const header = new Uint8Array(headerSize);
        const headerView = new DataView(header.buffer);
        header.set(SIGNATURE, 0);
        headerView.setUint32(SIGNATURE.byteLength, VERSION, true);
        await writeAligned(writer, header);

        for (const name in source.exports) {
            const ordinal = source.exports[name];
            await writeModulePart(writer, { type: PartType.Export, name, ordinal }, tag, utf8);
        }

        for (const element of source.elementTable) {
            await writeModulePart(writer, { type: PartType.Declare, element }, tag, utf8);
        }

        await writeModulePart(writer, { type: PartType.End }, tag, utf8);
    } finally {
        if (!borrowingWriter) {
            writer.releaseLock();
        }
    }
}
