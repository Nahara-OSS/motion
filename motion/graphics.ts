/**
 * Nahara's Motion graphics module.
 *
 * This module provides the functions and classes for doing graphics in Nahara's Motion.
 *
 * @module
 */

import { compareKeys } from "./utils.ts";
import * as png from "@img/png";

/**
 * Staging belt.
 *
 * Basically like `wgpu::utils::StagingBelt`, mainly for uniform buffers.
 *
 * ```typescript
 * const gpu = GPUDevice.current();
 * const uniform = remember(() => wrapToDisposable(gpu.createBuffer({ size: 256, usage: COPY_DST | UNIFORM })));
 * const belt = remember(() => new StagingBelt(gpu, 256 * 16));
 * const bindGroup = remember(() => gpu.createBindGroup({ layout, entries: [{ binding: 0, resource: uniform }] }));
 *
 * // ...
 *
 * belt.recall(); // must be called so the previously unmapped buffers can be reused
 *
 * const [beltBuffer, beltOffset, beltSize] = belt.write(256, buffer => {
 *     const view = new DataView(buffer);
 *     view.setFloat32(0, 100.0, true);
 *     view.setFloat32(4, 200.0, true);
 *     view.setFloat32(8, 300.0, true);
 * });
 *
 * const encoder = CommandEncoderContext.current();
 * encoder.copyBufferToBuffer(beltBuffer, beltOffset, uniform, 0, beltSize);
 *
 * const renderPass = encoder.beginRenderPass({ colorAttachments });
 * renderPass.setPipeline(pipeline);
 * renderPass.setBindGroup(0, bindGroup);
 * renderPass.draw(4, 1, 0, 0);
 * renderPass.end();
 *
 * belt.finish(); // must be called after finished writing or the source buffer will remains in mapped state
 * ```
 */
export class StagingBelt implements Disposable {
    #available: GPUBuffer[] = [];
    #pending: [used: number, buffer: GPUBuffer][] = [];
    #used: GPUBuffer[] = [];

    constructor(
        public readonly device: GPUDevice,
        public readonly sizePerBuffer: number,
    ) {}

    write(
        size: number,
        writer: (buffer: ArrayBuffer) => unknown,
    ): [
        source: GPUBuffer,
        sourceOffset: number,
        size: number,
    ] {
        const last = this.#pending.length - 1;

        if (this.#pending.length > 0 && this.#pending[last][1].size - this.#pending[last][0] >= size) {
            const start = this.#pending[last][0];
            const buffer = this.#pending[last][1];
            this.#pending[last][0] += size;
            writer(buffer.getMappedRange(start, size));
            return [buffer, start, size];
        }

        const buffer = this.#available.shift() ?? this.device.createBuffer({
            label: "Staging buffer",
            size: this.sizePerBuffer,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE,
            mappedAtCreation: true,
        });

        this.#pending.push([size, buffer]);
        writer(buffer.getMappedRange(0, size));
        return [buffer, 0, size];
    }

    /**
     * Finish writing.
     *
     * This method must be called after calling `write()` method multiple times to unmap the buffers so that the command
     * buffer with buffer copy commands can be submitted, otherwise a validation error will be raised due to the source
     * buffer still being in mapped state.
     */
    finish(): void {
        const pending = this.#pending;
        this.#pending = [];

        for (const [_, buffer] of pending) {
            buffer.unmap();
            this.#used.push(buffer);
        }
    }

    /**
     * Recall buffers.
     *
     * All buffers that are unmapped in `finish()` will be mapped for writing when calling this method. This must be
     * called to recycle buffers, or it will introduce memory leak due to buffers not being marked as reusable.
     */
    recall(): void {
        const buffers = this.#used;
        this.#used = [];

        for (const buffer of buffers) {
            buffer.mapAsync(GPUMapMode.WRITE).then(() => {
                this.#available.push(buffer);
            });
        }
    }

    [Symbol.dispose](): void {
        this.#available.forEach((buffer) => buffer.destroy());
        this.#pending.forEach(([_, buffer]) => buffer.destroy());
        this.#used.forEach((buffer) => buffer.destroy());
        this.#available = [];
        this.#pending = [];
        this.#used = [];
    }
}

export class UniformBelt implements Disposable {
    readonly uniform: GPUBuffer;
    #alignment: number;
    #inner: StagingBelt;

    constructor(gpu: GPUDevice, public readonly uniformSize: number, uniformsPerPart: number = 16) {
        const minAlignment = gpu.limits.minUniformBufferOffsetAlignment;
        this.uniform = gpu.createBuffer({ size: uniformSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM });
        this.#alignment = Math.floor(uniformSize / minAlignment) + (uniformSize % minAlignment ? 1 : 0);
        this.#alignment *= minAlignment;
        this.#inner = new StagingBelt(gpu, this.#alignment * uniformsPerPart);
    }

    write(encoder: GPUCommandEncoder, writer: (buffer: ArrayBuffer) => unknown): void {
        const [source, sourceOffset, sourceSize] = this.#inner.write(this.uniformSize, writer);
        encoder.copyBufferToBuffer(source, sourceOffset, this.uniform, 0, sourceSize);
    }

    finish(): void {
        this.#inner.finish();
    }

    recall(): void {
        this.#inner.recall();
    }

    [Symbol.dispose](): void {
        this.#inner[Symbol.dispose]();
    }
}

export class ModelBuffer<E> implements Disposable {
    #lastInput: unknown;
    #keys: unknown[] | null = null;
    #buffer: GPUBuffer | null = null;
    #arrayBuffer: ArrayBuffer | null = null;

    constructor(
        public readonly gpu: GPUDevice,
        public readonly bufferUsage: number,
        public readonly elementByteSize: number,
        public readonly writer: (element: E, view: DataView, offset: number) => unknown,
    ) {}

    get buffer(): GPUBuffer {
        if (this.#buffer == null) throw new Error("update() need to be called first");
        return this.#buffer;
    }

    update(input: ReadonlyArray<E>, keys: unknown[] = []): void {
        if (
            this.#buffer == null ||
            this.#arrayBuffer == null ||
            this.#arrayBuffer.byteLength < input.length * this.elementByteSize
        ) {
            this.#buffer?.destroy();
            this.#arrayBuffer = new ArrayBuffer(input.length * this.elementByteSize * 2);
            this.#buffer = this.gpu.createBuffer({ size: this.#arrayBuffer.byteLength, usage: this.bufferUsage });
        }

        if (
            this.#lastInput != input ||
            this.#keys == null ||
            !compareKeys(this.#keys, keys)
        ) {
            const view = new DataView(this.#arrayBuffer);
            this.#lastInput = input;
            this.#keys = keys;
            for (let i = 0; i < input.length; i++) this.writer(input[i], view, this.elementByteSize * i);
            this.gpu.queue.writeBuffer(this.#buffer, 0, this.#arrayBuffer, 0, this.elementByteSize * input.length);
        }
    }

    [Symbol.dispose](): void {
        this.#buffer?.destroy();
        this.#buffer = null;
        this.#arrayBuffer = null;
    }
}

/**
 * Attempt to decode raw image data and write to `GPUTexture`.
 *
 * @param gpu GPU device
 * @param image Encoded image data
 * @param usage GPU texture usage
 */
export async function decodeImageToTexture(gpu: GPUDevice, image: Blob, usage: number): Promise<GPUTexture | null> {
    if (globalThis.createImageBitmap != null && gpu.queue.copyExternalImageToTexture != null) {
        const imageBitmap = await createImageBitmap(image);
        const texture = gpu.createTexture({
            label: "Decoded image",
            format: "rgba8unorm",
            size: { width: imageBitmap.width, height: imageBitmap.height },
            usage,
        });
        gpu.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture },
            { width: imageBitmap.width, height: imageBitmap.height },
        );
        imageBitmap.close();
        return texture;
    }

    if (image.type == "image/png") {
        const { body: rgba, header: { width, height } } = await png.decodePNG(await image.bytes());
        const texture = gpu.createTexture({
            label: "Decoded image",
            format: "rgba8unorm",
            size: { width, height },
            usage,
        });
        gpu.queue.writeTexture(
            { texture },
            rgba,
            { bytesPerRow: width * 4, rowsPerImage: height },
            { width, height },
        );
        return texture;
    }

    return null;
}
