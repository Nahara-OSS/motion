import * as motion from "@nahara/motion";
import { TagCodec } from "./stream.ts";

export async function readType(
    stream: ReadableStream<Uint8Array> | ReadableStreamBYOBReader,
    tag: TagCodec = new TagCodec(),
): Promise<motion.model.Type> {
    const reader = stream instanceof ReadableStreamBYOBReader ? stream : stream.getReader({ mode: "byob" });
    const borrowingReader = stream instanceof ReadableStreamBYOBReader;

    try {
        const [kind, p1, p2] = await tag.read(reader);

        switch (kind as motion.model.TypeKind) {
            case motion.model.TypeKind.Concrete: {
                const typeOrdinal = p1;
                const parameterCount = p2;
                const parameters = [];
                for (let i = 0; i < parameterCount; i++) parameters.push(await readType(reader, tag));
                return { kind, typeOrdinal, parameters };
            }

            case motion.model.TypeKind.Parameterized: {
                const paramOrdinal = p1;
                return { kind, paramOrdinal };
            }

            default: {
                throw new Error(`Invalid type kind ID: 0x${kind.toString(16).padStart(2, "0")}`);
            }
        }
    } finally {
        if (!borrowingReader) {
            reader.releaseLock();
        }
    }
}

export async function writeType(
    stream: WritableStream<Uint8Array> | WritableStreamDefaultWriter<Uint8Array>,
    source: motion.model.Type,
    tag: TagCodec = new TagCodec(),
): Promise<void> {
    const writer = stream instanceof WritableStreamDefaultWriter ? stream : stream.getWriter();
    const borrowingWriter = stream instanceof WritableStreamDefaultWriter;

    try {
        switch (source.kind) {
            case motion.model.TypeKind.Concrete: {
                const { typeOrdinal, parameters } = source;
                await tag.write(writer, source.kind, typeOrdinal, parameters.length, 0);
                for (const type of parameters) await writeType(writer, type, tag);
                break;
            }

            case motion.model.TypeKind.Parameterized: {
                const { paramOrdinal } = source;
                await tag.write(writer, source.kind, paramOrdinal, 0, 0);
                break;
            }

            default: {
                throw new Error(`Unimplemented: ${(source as motion.model.Type).kind}`);
            }
        }
    } finally {
        if (!borrowingWriter) {
            writer.releaseLock();
        }
    }
}
