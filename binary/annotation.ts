import * as motion from "@nahara/motion";
import { readAligned, TagCodec, writeAligned } from "./stream.ts";

export async function readAnnotation(
    stream: ReadableStream<Uint8Array> | ReadableStreamBYOBReader,
    tag: TagCodec = new TagCodec(),
    utf8: TextDecoder = new TextDecoder(),
): Promise<motion.annotation.Annotation> {
    const reader = stream instanceof ReadableStreamBYOBReader ? stream : stream.getReader({ mode: "byob" });
    const borrowingReader = stream instanceof ReadableStreamBYOBReader;

    try {
        const [nameLen, count] = await tag.read(reader);
        const name = utf8.decode(await readAligned(reader, nameLen));
        const entries: [string, motion.annotation.AnnotationElement][] = [];

        for (let i = 0; i < count; i++) {
            const len = new Uint32Array((await readAligned(reader, 4)).buffer)[0];
            const name = utf8.decode(await readAligned(reader, len));
            const element = await readAnnotationElement(reader, tag, utf8);
            entries.push([name, element]);
        }

        return { name, entries: Object.fromEntries(entries) };
    } finally {
        if (!borrowingReader) {
            reader.releaseLock();
        }
    }
}

export async function writeAnnotation(
    stream: WritableStream<Uint8Array> | WritableStreamDefaultWriter<Uint8Array>,
    source: motion.annotation.Annotation,
    tag: TagCodec = new TagCodec(),
    utf8: TextEncoder = new TextEncoder(),
): Promise<void> {
    const writer = stream instanceof WritableStreamDefaultWriter ? stream : stream.getWriter();
    const borrowingWriter = stream instanceof WritableStreamDefaultWriter;

    try {
        const nameBuffer = utf8.encode(source.name);
        const entries = Object.entries(source.entries);
        await tag.write(writer, nameBuffer.length, entries.length, 0, 0);
        await writeAligned(writer, nameBuffer);

        for (const [name, element] of entries) {
            const nameBuffer = utf8.encode(name);
            await writer.write(new Uint8Array(new Uint32Array([nameBuffer.length]).buffer));
            await writeAligned(writer, nameBuffer);
            await writeAnnotationElement(writer, element, tag, utf8);
        }
    } finally {
        if (!borrowingWriter) {
            writer.releaseLock();
        }
    }
}

export async function readAnnotationElement(
    stream: ReadableStream<Uint8Array> | ReadableStreamBYOBReader,
    tag: TagCodec = new TagCodec(),
    utf8: TextDecoder = new TextDecoder(),
): Promise<motion.annotation.AnnotationElement> {
    const reader = stream instanceof ReadableStreamBYOBReader ? stream : stream.getReader({ mode: "byob" });
    const borrowingReader = stream instanceof ReadableStreamBYOBReader;

    try {
        const [type, p1] = await tag.read(reader);

        switch (type as motion.annotation.AnnotationType) {
            case motion.annotation.AnnotationType.Number: {
                const value = new Float64Array((await readAligned(reader, 8)).buffer)[0];
                return { type, value };
            }

            case motion.annotation.AnnotationType.Boolean: {
                const value = p1 == 1;
                return { type, value };
            }

            case motion.annotation.AnnotationType.String: {
                const value = utf8.decode(await readAligned(reader, p1));
                return { type, value };
            }

            case motion.annotation.AnnotationType.List: {
                const count = p1;
                const values: motion.annotation.AnnotationElement[] = [];
                for (let i = 0; i < count; i++) values.push(await readAnnotationElement(reader, tag, utf8));
                return { type, values };
            }

            case motion.annotation.AnnotationType.Dictionary: {
                const count = p1;
                const entries: [string, motion.annotation.AnnotationElement][] = [];

                for (let i = 0; i < count; i++) {
                    const len = new Uint32Array((await readAligned(reader, 4)).buffer)[0];
                    const name = utf8.decode(await readAligned(reader, len));
                    const value = await readAnnotationElement(reader, tag, utf8);
                    entries.push([name, value]);
                }

                return { type, values: Object.fromEntries(entries) };
            }

            default: {
                throw new Error(`Invalid annotation type ID: 0x${type.toString(16).padStart(2, "0")}`);
            }
        }
    } finally {
        if (!borrowingReader) {
            reader.releaseLock();
        }
    }
}

export async function writeAnnotationElement(
    stream: WritableStream<Uint8Array> | WritableStreamDefaultWriter<Uint8Array>,
    source: motion.annotation.AnnotationElement,
    tag: TagCodec = new TagCodec(),
    utf8: TextEncoder = new TextEncoder(),
): Promise<void> {
    const writer = stream instanceof WritableStreamDefaultWriter ? stream : stream.getWriter();
    const borrowingWriter = stream instanceof WritableStreamDefaultWriter;

    try {
        switch (source.type) {
            case motion.annotation.AnnotationType.Number: {
                const { value } = source;
                await tag.write(writer, source.type, 0, 0, 0);
                await writer.write(new Uint8Array(new Float64Array([value]).buffer));
                break;
            }

            case motion.annotation.AnnotationType.Boolean: {
                const { value } = source;
                await tag.write(writer, source.type, value ? 1 : 0, 0, 0);
                break;
            }

            case motion.annotation.AnnotationType.String: {
                const { value } = source;
                const buffer = utf8.encode(value);
                await tag.write(writer, source.type, buffer.byteLength, 0, 0);
                await writeAligned(writer, buffer);
                break;
            }

            case motion.annotation.AnnotationType.List: {
                const { values } = source;
                await tag.write(writer, source.type, values.length, 0, 0);
                for (const value of values) await writeAnnotationElement(writer, value, tag, utf8);
                break;
            }

            case motion.annotation.AnnotationType.Dictionary: {
                const entries = Object.entries(source.values);
                await tag.write(writer, source.type, entries.length, 0, 0);

                for (const [name, element] of entries) {
                    const nameBuffer = utf8.encode(name);
                    await writer.write(new Uint8Array(new Uint32Array([nameBuffer.length]).buffer));
                    await writeAnnotationElement(writer, element, tag, utf8);
                }

                break;
            }

            default: {
                throw new Error(`Unimplemented: ${(source as motion.annotation.AnnotationElement).type}`);
            }
        }
    } finally {
        if (!borrowingWriter) {
            writer.releaseLock();
        }
    }
}
