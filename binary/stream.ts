export type Writer = WritableStreamDefaultWriter<Uint8Array>;
export type Reader = ReadableStreamBYOBReader;
export const ALIGNMENT = 4;

export class TagCodec {
    #data = new Uint8Array(20);

    private static MAX_U8: number = 253;
    private static MAX_U16: number = 65535;
    private static U16_OF: number = 254;
    private static U32_OF: number = 255;

    async read(reader: Reader): Promise<[number, number, number, number]> {
        let buffer = this.#data.buffer;
        let result: ReadableStreamReadResult<Uint8Array<ArrayBuffer>>;
        let offset = 0;
        let count = 4;

        while (!(result = await reader.read(new Uint8Array(buffer, offset, count - offset))).done) {
            const all = new Uint8Array(result.value.buffer);
            offset += result.value.byteLength;
            buffer = result.value.buffer;
            count = 4;

            for (let i = 0; i < 4; i++) {
                const v = all[i];
                if (v == TagCodec.U16_OF) count += 2;
                if (v == TagCodec.U32_OF) count += 4;
            }

            if ((count % ALIGNMENT) != 0) count += ALIGNMENT - (count % ALIGNMENT);
            if (offset == count) break;
        }

        buffer = result.value?.buffer ?? buffer;
        if (result.done && offset < count) throw new Error(`End of stream early (read ${offset} out of ${count})`);
        if (buffer.detached) throw new Error("BUG: Buffer is still detached");

        this.#data = new Uint8Array(buffer);
        offset = 4;
        const view = new DataView(buffer);
        const vals = [this.#data[0], this.#data[1], this.#data[2], this.#data[3]];

        for (let i = 0; i < vals.length; i++) {
            const v = vals[i];

            if (v == TagCodec.U16_OF) {
                vals[i] = view.getUint16(offset, true);
                offset += 2;
            }

            if (v == TagCodec.U32_OF) {
                vals[i] = view.getUint32(offset, true);
                offset += 4;
            }
        }

        return vals as [number, number, number, number];
    }

    async write(writer: Writer, a: number, b: number, c: number, d: number): Promise<void> {
        const view = new DataView(this.#data.buffer);
        const vals = [a, b, c, d];
        let offset = 4;

        for (let i = 0; i < vals.length; i++) {
            const v = vals[i];
            this.#data[i] = v <= TagCodec.MAX_U8 ? v : v <= TagCodec.MAX_U16 ? TagCodec.U16_OF : TagCodec.U32_OF;

            if (this.#data[i] == TagCodec.U16_OF) {
                view.setUint16(offset, v, true);
                offset += 2;
            }

            if (this.#data[i] == TagCodec.U32_OF) {
                view.setUint32(offset, v, true);
                offset += 4;
            }
        }

        if ((offset % ALIGNMENT) != 0) {
            const pad = ALIGNMENT - (offset % ALIGNMENT);
            for (let i = 0; i < pad; i++) this.#data[offset + i] = 0;
            offset += pad;
        }

        await writer.write(new Uint8Array(this.#data.buffer, 0, offset));
    }
}

export async function readAligned(reader: Reader, count: number): Promise<Uint8Array> {
    const alignedCount = Math.ceil(count / ALIGNMENT) * ALIGNMENT;
    if (alignedCount == 0) return new Uint8Array(0);

    let buffer = new ArrayBuffer(alignedCount);
    let offset = 0;
    let result: ReadableStreamReadResult<Uint8Array<ArrayBuffer>>;

    while (!(result = await reader.read(new Uint8Array(buffer, offset, alignedCount - offset))).done) {
        buffer = result.value.buffer;
        offset += result.value.byteLength;
        if (offset == alignedCount) break;
    }

    buffer = result.value?.buffer ?? buffer;
    if (offset != alignedCount) throw new Error(`End of stream early (read ${offset} out of ${alignedCount})`);
    if (buffer.detached) throw new Error("BUG: Buffer is still detached");
    return new Uint8Array(buffer, 0, count);
}

export async function writeAligned(writer: Writer, data: Uint8Array): Promise<void> {
    await writer.write(data);

    if ((data.byteLength % ALIGNMENT) != 0) {
        const pad = ALIGNMENT - (data.byteLength % ALIGNMENT);
        await writer.write(new Uint8Array(pad));
    }
}
