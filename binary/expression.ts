import * as motion from "@nahara/motion";
import { readAligned, TagCodec, writeAligned } from "./stream.ts";
import { readType, writeType } from "./type.ts";

export async function readExpression(
    stream: ReadableStream<Uint8Array> | ReadableStreamBYOBReader,
    tag: TagCodec = new TagCodec(),
    utf8: TextDecoder = new TextDecoder(),
): Promise<motion.model.Expression> {
    const reader = stream instanceof ReadableStreamBYOBReader ? stream : stream.getReader({ mode: "byob" });
    const borrowingReader = stream instanceof ReadableStreamBYOBReader;

    try {
        const [kind, p1, p2, p3] = await tag.read(reader);

        switch (kind as motion.model.ExpressionKind) {
            case motion.model.ExpressionKind.Default: {
                return { kind };
            }

            case motion.model.ExpressionKind.VariableGet: {
                const variableOrdinal = p1;
                return { kind, variableOrdinal };
            }

            case motion.model.ExpressionKind.PatternMatch: {
                const caseCount = p1;
                const cases: [string, motion.model.Expression][] = [];
                const targetType = await readType(reader, tag);
                const target = await readExpression(reader, tag, utf8);

                for (let i = 0; i < caseCount; i++) {
                    const len = new Uint32Array((await readAligned(reader, 4)).buffer)[0];
                    const option = utf8.decode(await readAligned(reader, len));
                    const expr = await readExpression(reader, tag, utf8);
                    cases.push([option, expr]);
                }

                const fallback = await readExpression(reader, tag, utf8);
                return { kind, targetType, target, cases: Object.fromEntries(cases), fallback };
            }

            case motion.model.ExpressionKind.FunctionInvoke: {
                const functionOrdinal = p1;
                const typeParamsCount = p2;
                const inputCount = p3;
                const typeParams: motion.model.Type[] = [];
                const inputs: motion.model.Expression[] = [];

                for (let i = 0; i < typeParamsCount; i++) {
                    const type = await readType(reader, tag);
                    typeParams.push(type);
                }

                for (let i = 0; i < inputCount; i++) {
                    const expr = await readExpression(reader, tag, utf8);
                    inputs.push(expr);
                }

                return { kind, functionOrdinal, typeParams, inputs };
            }

            case motion.model.ExpressionKind.ParameterInvoke: {
                const parameter = utf8.decode(await readAligned(reader, p1));
                const inputCount = p2;
                const inputs: motion.model.Expression[] = [];

                for (let i = 0; i < inputCount; i++) {
                    const expr = await readExpression(reader, tag, utf8);
                    inputs.push(expr);
                }

                return { kind, parameter, inputs };
            }

            case motion.model.ExpressionKind.Number: {
                const value = new Float64Array((await readAligned(reader, 8)).buffer)[0];
                return { kind, value };
            }

            case motion.model.ExpressionKind.Boolean: {
                const value = p1 == 1;
                return { kind, value };
            }

            case motion.model.ExpressionKind.String: {
                const value = utf8.decode(await readAligned(reader, p1));
                return { kind, value };
            }

            case motion.model.ExpressionKind.Array: {
                const count = p1;
                const elements: motion.model.Expression[] = [];
                for (let i = 0; i < count; i++) elements.push(await readExpression(reader, tag, utf8));
                return { kind, elements };
            }

            case motion.model.ExpressionKind.Struct: {
                const count = p1;
                const fields: [string, motion.model.Expression][] = [];

                for (let i = 0; i < count; i++) {
                    const len = new Uint32Array((await readAligned(reader, 4)).buffer)[0];
                    const name = utf8.decode(await readAligned(reader, len));
                    const expr = await readExpression(reader, tag, utf8);
                    fields.push([name, expr]);
                }

                return { kind, fields: Object.fromEntries(fields) };
            }

            case motion.model.ExpressionKind.Variant: {
                const option = utf8.decode(await readAligned(reader, p1));
                const data = p2 != 1 ? null : await readExpression(reader, tag, utf8);
                return { kind, option, data };
            }

            case motion.model.ExpressionKind.Asset: {
                const assetOrdinal = p1;
                return { kind, assetOrdinal };
            }

            default: {
                throw new Error(`Invalid expression type ID: 0x${kind.toString(16).padStart(2, "0")}`);
            }
        }
    } finally {
        if (!borrowingReader) {
            reader.releaseLock();
        }
    }
}

export async function writeExpression(
    stream: WritableStream<Uint8Array> | WritableStreamDefaultWriter<Uint8Array>,
    source: motion.model.Expression,
    tag: TagCodec = new TagCodec(),
    utf8: TextEncoder = new TextEncoder(),
): Promise<void> {
    const writer = stream instanceof WritableStreamDefaultWriter ? stream : stream.getWriter();
    const borrowingWriter = stream instanceof WritableStreamDefaultWriter;

    try {
        switch (source.kind) {
            case motion.model.ExpressionKind.Default: {
                await tag.write(writer, source.kind, 0, 0, 0);
                break;
            }

            case motion.model.ExpressionKind.VariableGet: {
                const { variableOrdinal } = source;
                await tag.write(writer, source.kind, variableOrdinal, 0, 0);
                break;
            }

            case motion.model.ExpressionKind.PatternMatch: {
                const { targetType, target, fallback } = source;
                const cases = Object.entries(source.cases);
                await tag.write(writer, source.kind, cases.length, 0, 0);
                await writeType(writer, targetType, tag);
                await writeExpression(writer, target, tag, utf8);

                for (const [option, expr] of cases) {
                    const optionBuffer = utf8.encode(option);
                    await writer.write(new Uint8Array(new Uint32Array([optionBuffer.length]).buffer));
                    await writeAligned(writer, optionBuffer);
                    await writeExpression(writer, expr, tag, utf8);
                }

                await writeExpression(writer, fallback, tag, utf8);
                break;
            }

            case motion.model.ExpressionKind.FunctionInvoke: {
                const { functionOrdinal, typeParams, inputs } = source;
                await tag.write(writer, source.kind, functionOrdinal, typeParams.length, inputs.length);
                for (const type of typeParams) await writeType(writer, type, tag);
                for (const input of inputs) await writeExpression(writer, input, tag, utf8);
                break;
            }

            case motion.model.ExpressionKind.ParameterInvoke: {
                const { parameter, inputs } = source;
                const parameterBuffer = utf8.encode(parameter);
                await tag.write(writer, source.kind, parameterBuffer.byteLength, inputs.length, 0);
                await writeAligned(writer, parameterBuffer);
                for (const input of inputs) await writeExpression(writer, input, tag, utf8);
                break;
            }

            case motion.model.ExpressionKind.Number: {
                const { value } = source;
                // TODO: store value on tag parameters
                // value that is safe _unsigned_ integer and less than 2^32 - 1 can be stored right on tag parameter
                await tag.write(writer, source.kind, 0, 0, 0);
                await writer.write(new Uint8Array(new Float64Array([value]).buffer));
                break;
            }

            case motion.model.ExpressionKind.Boolean: {
                const { value } = source;
                await tag.write(writer, source.kind, value ? 1 : 0, 0, 0);
                break;
            }

            case motion.model.ExpressionKind.String: {
                const { value } = source;
                const textBuffer = utf8.encode(value);
                await tag.write(writer, source.kind, textBuffer.byteLength, 0, 0);
                await writeAligned(writer, textBuffer);
                break;
            }

            case motion.model.ExpressionKind.Array: {
                const { elements } = source;
                await tag.write(writer, source.kind, elements.length, 0, 0);
                for (const element of elements) await writeExpression(writer, element, tag, utf8);
                break;
            }

            case motion.model.ExpressionKind.Struct: {
                const fields = Object.entries(source.fields);
                await tag.write(writer, source.kind, fields.length, 0, 0);

                for (const [name, value] of fields) {
                    const nameBuffer = utf8.encode(name);
                    await writer.write(new Uint8Array(new Uint32Array([nameBuffer.length]).buffer));
                    await writeAligned(writer, nameBuffer);
                    await writeExpression(writer, value, tag, utf8);
                }

                break;
            }

            case motion.model.ExpressionKind.Variant: {
                const { option, data } = source;
                const optionBuffer = utf8.encode(option);
                await tag.write(writer, source.kind, optionBuffer.byteLength, data != null ? 1 : 0, 0);
                await writeAligned(writer, optionBuffer);
                if (data != null) await writeExpression(writer, data, tag, utf8);
                break;
            }

            case motion.model.ExpressionKind.Asset: {
                const { assetOrdinal } = source;
                await tag.write(writer, source.kind, assetOrdinal, 0, 0);
                break;
            }

            default: {
                throw new Error(`Unimplemented: 0x${(source as motion.model.Type).kind}`);
            }
        }
    } finally {
        if (!borrowingWriter) {
            writer.releaseLock();
        }
    }
}
