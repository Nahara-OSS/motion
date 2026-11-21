import * as motion from "@nahara/motion";
import { readAligned, TagCodec, writeAligned } from "./stream.ts";
import { writeAnnotation } from "./annotation.ts";
import { readType, writeType } from "./type.ts";
import { readExpression, writeExpression } from "./expression.ts";
import { readAnnotation } from "@nahara/motion-binary";

// type parameters and annotations are handled in module part reader/writer

enum ComponentPart {
    End = 0x00,
    Parameter = 0x01,
    Slot = 0x02,
}

export async function readComponentInPart(
    stream: ReadableStream<Uint8Array> | ReadableStreamBYOBReader,
    annotations: readonly motion.annotation.Annotation[],
    typeParams: readonly motion.model.TypeParameter[],
    tag: TagCodec = new TagCodec(),
    utf8: TextDecoder = new TextDecoder(),
): Promise<motion.model.Component> {
    const reader = stream instanceof ReadableStreamBYOBReader ? stream : stream.getReader({ mode: "byob" });
    const borrowingReader = stream instanceof ReadableStreamBYOBReader;

    try {
        const parameters: [string, motion.model.Parameter][] = [];
        const slots: [string, motion.model.Slot][] = [];
        const content: motion.model.ComponentChild[] = [];
        let componentPartTag: [number, number, number, number];
        let child: motion.model.ComponentChild | null;

        while ((componentPartTag = await tag.read(reader))[0] != ComponentPart.End) {
            const [type, p1, p2, p3] = componentPartTag;

            switch (type as ComponentPart) {
                case ComponentPart.Parameter: {
                    const name = utf8.decode(await readAligned(reader, p1));
                    const inputCount = p2;
                    const annotationCount = p3;
                    const inputs: motion.model.Input[] = [];
                    const annotations: motion.annotation.Annotation[] = [];

                    for (let i = 0; i < annotationCount; i++) {
                        const annotation = await readAnnotation(reader, tag, utf8);
                        annotations.push(annotation);
                    }

                    for (let i = 0; i < inputCount; i++) {
                        const [annotationCount] = await tag.read(reader);
                        const annotations: motion.annotation.Annotation[] = [];

                        for (let i = 0; i < annotationCount; i++) {
                            const annotation = await readAnnotation(reader, tag, utf8);
                            annotations.push(annotation);
                        }

                        const type = await readType(reader, tag);
                        inputs.push({ annotations, type });
                    }

                    const output = await readType(reader, tag);
                    const fallback = await readExpression(reader, tag, utf8);
                    parameters.push([name, { annotations, inputs, output, fallback }]);
                    break;
                }

                case ComponentPart.Slot: {
                    const name = utf8.decode(await readAligned(reader, p1));
                    const inputCount = p2;
                    const annotationCount = p3;
                    const inputs: motion.model.Input[] = [];
                    const annotations: motion.annotation.Annotation[] = [];

                    for (let i = 0; i < annotationCount; i++) {
                        const annotation = await readAnnotation(reader, tag, utf8);
                        annotations.push(annotation);
                    }

                    for (let i = 0; i < inputCount; i++) {
                        const [annotationCount] = await tag.read(reader);
                        const annotations: motion.annotation.Annotation[] = [];

                        for (let i = 0; i < annotationCount; i++) {
                            const annotation = await readAnnotation(reader, tag, utf8);
                            annotations.push(annotation);
                        }

                        const type = await readType(reader, tag);
                        inputs.push({ annotations, type });
                    }

                    slots.push([name, { annotations, inputs }]);
                    break;
                }
            }
        }

        while ((child = await readComponentChild(reader, tag, utf8)) != null) {
            content.push(child);
        }

        return {
            kind: motion.model.ElementKind.Component,
            annotations,
            typeParams,
            parameters: Object.fromEntries(parameters),
            slots: Object.fromEntries(slots),
            content,
        };
    } finally {
        if (!borrowingReader) {
            reader.releaseLock();
        }
    }
}

export async function writeComponentInPart(
    stream: WritableStream<Uint8Array> | WritableStreamDefaultWriter<Uint8Array>,
    source: motion.model.Component,
    tag: TagCodec = new TagCodec(),
    utf8: TextEncoder = new TextEncoder(),
): Promise<void> {
    const writer = stream instanceof WritableStreamDefaultWriter ? stream : stream.getWriter();
    const borrowingWriter = stream instanceof WritableStreamDefaultWriter;

    try {
        const { content } = source;
        const parameters = Object.entries(source.parameters);
        const slots = Object.entries(source.slots);

        for (const [name, { annotations, inputs, output, fallback }] of parameters) {
            const nameBuffer = utf8.encode(name);
            await tag.write(writer, ComponentPart.Parameter, nameBuffer.length, inputs.length, annotations.length);
            await writeAligned(writer, nameBuffer);

            for (const annotation of annotations) {
                await writeAnnotation(writer, annotation, tag, utf8);
            }

            for (const { annotations, type } of inputs) {
                await tag.write(writer, annotations.length, 0, 0, 0);

                for (const annotation of annotations) {
                    await writeAnnotation(writer, annotation, tag, utf8);
                }

                await writeType(writer, type, tag);
            }

            await writeType(writer, output, tag);
            await writeExpression(writer, fallback, tag, utf8);
        }

        for (const [name, { annotations, inputs }] of slots) {
            const nameBuffer = utf8.encode(name);
            await tag.write(writer, ComponentPart.Slot, nameBuffer.length, inputs.length, annotations.length);
            await writeAligned(writer, nameBuffer);

            for (const annotation of annotations) {
                await writeAnnotation(writer, annotation, tag, utf8);
            }

            for (const { annotations, type } of inputs) {
                await tag.write(writer, annotations.length, 0, 0, 0);
                await writeType(writer, type, tag);

                for (const annotation of annotations) {
                    await writeAnnotation(writer, annotation, tag, utf8);
                }
            }
        }

        await tag.write(writer, ComponentPart.End, 0, 0, 0);

        for (const child of content) {
            await writeComponentChild(writer, child, tag, utf8);
        }

        await writeComponentChild(writer, null, tag, utf8);
    } finally {
        if (!borrowingWriter) {
            writer.releaseLock();
        }
    }
}

enum ObjectPart {
    End = 0x00,
    Parameter = 0x01,
    Slot = 0x02,
}

export async function readComponentChild(
    stream: ReadableStream<Uint8Array> | ReadableStreamBYOBReader,
    tag: TagCodec = new TagCodec(),
    utf8: TextDecoder = new TextDecoder(),
): Promise<motion.model.ComponentChild | null> {
    const reader = stream instanceof ReadableStreamBYOBReader ? stream : stream.getReader({ mode: "byob" });
    const borrowingReader = stream instanceof ReadableStreamBYOBReader;

    try {
        const [type, p1, p2] = await tag.read(reader);

        switch (type as motion.model.ComponentChildType) {
            case motion.model.ComponentChildType.Reserved: {
                return null;
            }

            case motion.model.ComponentChildType.Object: {
                const componentOrdinal = p1;
                const typeParamCount = p2;
                const typeParams: motion.model.Type[] = [];
                const parameters: [string, motion.model.Expression][] = [];
                const slots: [string, motion.model.ComponentChild[]][] = [];

                for (let i = 0; i < typeParamCount; i++) {
                    const type = await readType(reader, tag);
                    typeParams.push(type);
                }

                let objectPartTag: [number, number, number, number];

                while ((objectPartTag = await tag.read(reader))[0] != ObjectPart.End) {
                    const [type, p1] = objectPartTag;

                    switch (type as ObjectPart) {
                        case ObjectPart.Parameter: {
                            const len = p1;
                            const name = utf8.decode(await readAligned(reader, len));
                            const expr = await readExpression(reader, tag, utf8);
                            parameters.push([name, expr]);
                            break;
                        }

                        case ObjectPart.Slot: {
                            const len = p1;
                            const name = utf8.decode(await readAligned(reader, len));
                            const content: motion.model.ComponentChild[] = [];
                            let child: motion.model.ComponentChild | null;
                            while ((child = await readComponentChild(reader, tag, utf8)) != null) content.push(child);
                            slots.push([name, content]);
                            break;
                        }
                    }
                }

                return {
                    type,
                    componentOrdinal,
                    typeParams,
                    parameters: Object.fromEntries(parameters),
                    slots: Object.fromEntries(slots),
                };
            }

            case motion.model.ComponentChildType.UseSlot: {
                const len = p1;
                const inputCount = p2;
                const slot = utf8.decode(await readAligned(reader, len));
                const inputs: motion.model.Expression[] = [];

                for (let i = 0; i < inputCount; i++) {
                    const expr = await readExpression(reader, tag, utf8);
                    inputs.push(expr);
                }

                return { type, slot, inputs };
            }

            default: {
                throw new Error(`Invalid component child type ID: 0x${type.toString(16).padStart(2, "0")}`);
            }
        }
    } finally {
        if (!borrowingReader) {
            reader.releaseLock();
        }
    }
}

export async function writeComponentChild(
    stream: WritableStream<Uint8Array> | WritableStreamDefaultWriter<Uint8Array>,
    source: motion.model.ComponentChild | null,
    tag: TagCodec = new TagCodec(),
    utf8: TextEncoder = new TextEncoder(),
): Promise<void> {
    const writer = stream instanceof WritableStreamDefaultWriter ? stream : stream.getWriter();
    const borrowingWriter = stream instanceof WritableStreamDefaultWriter;

    try {
        if (source == null) {
            await tag.write(writer, motion.model.ComponentChildType.Reserved, 0, 0, 0);
            return;
        }

        switch (source.type) {
            case motion.model.ComponentChildType.Object: {
                const { componentOrdinal, typeParams } = source;
                const parameters = Object.entries(source.parameters);
                const slots = Object.entries(source.slots);
                await tag.write(writer, source.type, componentOrdinal, typeParams.length, 0);

                for (const type of typeParams) {
                    await writeType(writer, type, tag);
                }

                for (const [name, expr] of parameters) {
                    const nameBuffer = utf8.encode(name);
                    await tag.write(writer, ObjectPart.Parameter, nameBuffer.byteLength, 0, 0);
                    await writeExpression(writer, expr, tag, utf8);
                }

                for (const [name, content] of slots) {
                    const nameBuffer = utf8.encode(name);
                    await tag.write(writer, ObjectPart.Slot, nameBuffer.byteLength, 0, 0);
                    for (const child of content) await writeComponentChild(writer, child, tag, utf8);
                    await writeComponentChild(writer, null, tag, utf8);
                }

                await tag.write(writer, ObjectPart.End, 0, 0, 0);
                break;
            }

            case motion.model.ComponentChildType.UseSlot: {
                const { slot, inputs } = source;
                const buffer = utf8.encode(slot);
                await tag.write(writer, source.type, buffer.byteLength, inputs.length, 0);
                await writeAligned(writer, buffer);
                for (const input of inputs) await writeExpression(writer, input, tag, utf8);
                break;
            }

            default: {
                throw new Error(`Unimplemented: ${(source as motion.model.ComponentChild).type}`);
            }
        }
    } finally {
        if (!borrowingWriter) {
            writer.releaseLock();
        }
    }
}
