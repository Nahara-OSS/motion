import * as motion from "@nahara/motion";
import { readAligned, TagCodec, writeAligned } from "./stream.ts";
import { readAnnotation, writeAnnotation } from "./annotation.ts";
import { readComponentInPart, writeComponentInPart } from "./component.ts";

export enum PartType {
    End = 0x00,
    Export = 0x01,
    Declare = 0x02,
}

export type ModulePart =
    | EndPart
    | ExportPart
    | DeclarePart;

export interface EndPart {
    readonly type: PartType.End;
}

export interface ExportPart {
    readonly type: PartType.Export;
    readonly ordinal: number;
    readonly name: string;
}

export interface DeclarePart {
    readonly type: PartType.Declare;
    readonly element: motion.model.Element;
}

const elementDeclarations: Partial<
    Record<motion.model.ElementKind, {
        readonly read: (
            reader: ReadableStreamBYOBReader,
            annotation: readonly motion.annotation.Annotation[],
            typeParams: readonly motion.model.TypeParameter[],
            tag: TagCodec,
            utf8: TextDecoder,
        ) => Promise<motion.model.Element>;

        readonly write: (
            writer: WritableStreamDefaultWriter,
            source: motion.model.Element,
            tag: TagCodec,
            utf8: TextEncoder,
        ) => Promise<void>;
    }>
> = {
    [motion.model.ElementKind.Component]: {
        read: (r, a, tp, tag, utf8) => readComponentInPart(r, a, tp, tag, utf8),
        write: (w, s, tag, utf8) => writeComponentInPart(w, s as motion.model.Component, tag, utf8),
    },
};

export async function readModulePart(
    stream: ReadableStream<Uint8Array> | ReadableStreamBYOBReader,
    tag: TagCodec = new TagCodec(),
    utf8: TextDecoder = new TextDecoder(),
): Promise<ModulePart> {
    const reader = stream instanceof ReadableStreamBYOBReader ? stream : stream.getReader({ mode: "byob" });
    const borrowingReader = stream instanceof ReadableStreamBYOBReader;

    try {
        const [type, p1, p2, p3] = await tag.read(reader);

        switch (type as PartType) {
            case PartType.End: {
                return { type };
            }

            case PartType.Export: {
                const ordinal = p1;
                const nameLen = p2;
                const name = utf8.decode(await readAligned(reader, nameLen));
                return { type, ordinal, name };
            }

            case PartType.Declare: {
                const elementKind = p1 as motion.model.ElementKind;

                switch (elementKind) {
                    case motion.model.ElementKind.ImportElement: {
                        const module = utf8.decode(await readAligned(reader, p2));
                        const name = utf8.decode(await readAligned(reader, p3));
                        return { type, element: { kind: elementKind, module, name } };
                    }

                    case motion.model.ElementKind.ImportAsset: {
                        const name = utf8.decode(await readAligned(reader, p3));
                        return { type, element: { kind: elementKind, name } };
                    }

                    default: {
                        const annotationCount = p2;
                        const typeParamCount = p3;
                        const annotations: motion.annotation.Annotation[] = [];
                        const typeParams: motion.model.TypeParameter[] = [];

                        for (let i = 0; i < annotationCount; i++) {
                            const annotation = await readAnnotation(reader, tag, utf8);
                            annotations.push(annotation);
                        }

                        for (let i = 0; i < typeParamCount; i++) {
                            const [annotationCount] = await tag.read(reader);
                            const annotations: motion.annotation.Annotation[] = [];

                            for (let i = 0; i < annotationCount; i++) {
                                const annotation = await readAnnotation(reader, tag, utf8);
                                annotations.push(annotation);
                            }

                            typeParams.push({ annotations });
                        }

                        const decl = elementDeclarations[elementKind];
                        if (decl == null) throw new Error(`Unimplemented element type: ${elementKind}`);
                        return { type, element: await decl.read(reader, annotations, typeParams, tag, utf8) };
                    }
                }
            }

            default: {
                throw new Error(`Invalid module part type ID: 0x${type.toString(16).padStart(2, "0")}`);
            }
        }
    } finally {
        if (!borrowingReader) {
            reader.releaseLock();
        }
    }
}

export async function writeModulePart(
    stream: WritableStream<Uint8Array> | WritableStreamDefaultWriter,
    part: ModulePart,
    tag: TagCodec = new TagCodec(),
    utf8: TextEncoder = new TextEncoder(),
): Promise<void> {
    const writer = stream instanceof WritableStreamDefaultWriter ? stream : stream.getWriter();
    const borrowingWriter = stream instanceof WritableStreamDefaultWriter;

    try {
        switch (part.type) {
            case PartType.End: {
                await tag.write(writer, part.type, 0, 0, 0);
                break;
            }

            case PartType.Export: {
                const { ordinal, name } = part;
                const nameBuffer = utf8.encode(name);
                await tag.write(writer, part.type, ordinal, nameBuffer.byteLength, 0);
                await writeAligned(writer, nameBuffer);
                break;
            }

            case PartType.Declare: {
                const { element } = part;

                switch (element.kind) {
                    case motion.model.ElementKind.ImportElement: {
                        const { module, name } = element;
                        const moduleBuffer = utf8.encode(module);
                        const nameBuffer = utf8.encode(name);
                        await tag.write(
                            writer,
                            part.type,
                            element.kind,
                            moduleBuffer.byteLength,
                            nameBuffer.byteLength,
                        );
                        await writeAligned(writer, moduleBuffer);
                        await writeAligned(writer, nameBuffer);
                        break;
                    }

                    // p2 of import-asset is intentionally zero
                    // it is reserved for future use... if we wanted to...
                    case motion.model.ElementKind.ImportAsset: {
                        const { name } = element;
                        const nameBuffer = utf8.encode(name);
                        await tag.write(writer, part.type, element.kind, 0, nameBuffer.byteLength);
                        await writeAligned(writer, nameBuffer);
                        break;
                    }

                    default: {
                        await tag.write(
                            writer,
                            part.type,
                            element.kind,
                            element.annotations.length,
                            element.typeParams.length,
                        );

                        for (const annotation of element.annotations) {
                            await writeAnnotation(writer, annotation, tag, utf8);
                        }

                        for (const typeParam of element.typeParams) {
                            await tag.write(writer, typeParam.annotations.length, 0, 0, 0);

                            for (const annotation of typeParam.annotations) {
                                await writeAnnotation(writer, annotation);
                            }
                        }

                        const decl = elementDeclarations[element.kind];
                        if (decl == null) throw new Error(`Unimplemented element type: ${element.kind}`);
                        await decl.write(writer, element, tag, utf8);
                        break;
                    }
                }

                break;
            }

            default: {
                throw new Error(`Unimplemented: ${(part as ModulePart).type}`);
            }
        }
    } finally {
        if (!borrowingWriter) {
            writer.releaseLock();
        }
    }
}
