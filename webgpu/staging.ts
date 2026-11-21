import { COPY_BUFFER_ALIGNMENT } from "./constant.ts";
import { align } from "./extra.ts";

/**
 * Staging belt
 *
 * It is recommended to create a staging belt with chunk size that is big enough (around 16 MiB/each), so that the
 * implementation doesn't have to create or cycle through many buffers.
 *
 * Stolen from `wgpu::util::StagingBelt` with some minor improvements (which is just {@link StagingBelt.stream} really).
 */
export class StagingBelt implements Disposable {
    #device: GPUDevice;
    #free: GPUBuffer[] = [];
    #pending: PendingBuffer[] = [];
    #mapped: GPUBuffer[] = [];

    readonly chunkSize: number;
    readonly alignment: number;
    readonly usage: number;

    constructor(options: StagingBeltOptions) {
        const defaultUsage = GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE;
        const { chunkSize, alignment = COPY_BUFFER_ALIGNMENT, usage = defaultUsage } = options;

        this.#device = options.device;
        this.chunkSize = chunkSize;
        this.alignment = alignment;
        this.usage = usage;

        if (chunkSize < alignment) {
            throw new Error(`Chunk size (${chunkSize}) is smaller than alignment ${alignment}`);
        }

        if (alignment % COPY_BUFFER_ALIGNMENT != 0) {
            throw new Error(`Allocation alignment is not a multiples of ${COPY_BUFFER_ALIGNMENT}`);
        }
    }

    /**
     * Compact the staging belt
     *
     * Call this when more VRAM need to be reclaimed. This will release all currently free (unused) buffers.
     */
    compact(): void {
        this.#free.forEach((buffer) => buffer.destroy());
        this.#free = [];
    }

    /**
     * Allocate a small chunk of data in staging belt's buffer for writing
     *
     * The buffer from {@link StagingBeltAllocation.buffer} is guaranteed to be mapped for writing after this function
     * returned until the {@link StagingBelt.finish} is called. You can then encode GPU commands that copy the allocated
     * chunk to another `GPUBuffer`, such as uniform buffer or vertex buffer.
     *
     * @param size Number of bytes to allocate
     * @returns Slice in staging belt
     */
    allocate(size: number): StagingBeltAllocation {
        let buffer = this.#pending.at(-1);

        if (buffer == null || buffer.used + size > buffer.buffer.size) {
            const freeBuffer = this.#free.pop() ?? this.#device.createBuffer({
                label: "Staging belt's buffer",
                size: this.chunkSize,
                usage: this.usage,
                mappedAtCreation: true,
            });

            this.#pending.push(buffer = { buffer: freeBuffer, used: 0 });
        }

        const offset = buffer.used;
        buffer.used += align(size, this.alignment);
        return { buffer: buffer.buffer, offset, size };
    }

    /**
     * Allocate a small chunk from staging belt's buffer and encode copy command to copy from that small chunk to target
     * buffer
     *
     * The target buffer must have `COPY_DST` usage.
     *
     * @param buffer Target buffer
     * @param offset Offset in target buffer
     * @param size Size in bytes
     * @param encoder Command encoder to encode copy command
     */
    write(
        buffer: GPUBuffer,
        offset: number,
        size: number,
        encoder: GPUCommandEncoder,
    ): ArrayBuffer;

    /**
     * Allocate a small chunk from staging belt's buffer, encode copy command to copy from that small chunk to target
     * buffer and map the `ArrayBuffer` to data view of it
     *
     * The target buffer must have `COPY_DST` usage.
     *
     * @param buffer Target buffer
     * @param offset Offset in target buffer
     * @param size Size in bytes
     * @param encoder Command encoder to encode copy command
     * @param map Map `ArrayBuffer` to data view
     */
    write<T>(
        buffer: GPUBuffer,
        offset: number,
        size: number,
        encoder: GPUCommandEncoder,
        map: (buffer: ArrayBuffer) => T,
    ): T;

    write<T>(
        buffer: GPUBuffer,
        offset: number,
        size: number,
        encoder: GPUCommandEncoder,
        map: (buffer: ArrayBuffer) => T = (x) => x as T,
    ): ArrayBuffer | T {
        const alloc = this.allocate(size);
        encoder.copyBufferToBuffer(alloc.buffer, alloc.offset, buffer, offset, size);
        return map(alloc.buffer.getMappedRange(alloc.offset, alloc.size));
    }

    /**
     * Create a new handle to stream data to GPU
     *
     * Set the maximum number of bytes to the amount that the callback can handle (e.g. up to limit of vertex buffer)
     * and the callback will be called such that the number of bytes in allocation will always be less than or equal to
     * provided limit. This is useful for streaming in data where the limit is not known (such as dynamically generated
     * mesh).
     *
     * The callback is the function that consume the allocated slice (e.g. encode copy command to copy from that slice
     * to vertex buffer, then run render pass with that vertex buffer). The callback will be called automatically when
     * the allocation switches to new buffer, the limit is reached, or when {@link StagingBeltStream.flush} is called.
     *
     * ```
     * const belt: StagingBelt;
     * const vertexBufferPool: ResourcePool<GPUBuffer, void>;
     * const bytesPerVertex: number;
     * const vertexBufferSize: number; // Bytes per vertex buffer
     *
     * const encoder = device.createCommandEncoder();
     * const borrowedVertexBuffers: { handle: Borrowed<GPUBuffer>, vertexCount: number }[] = [];
     *
     * {
     *     using stream = belt.stream(vertexBufferSize, ({ buffer, offset, size }) => {
     *         const vertexCount = size / bytesPerVertex;
     *         const handle = vertexBufferPool.borrow();
     *         borrowedVertexBuffers.push({ handle, vertexCount });
     *         encoder.copyBufferToBuffer(buffer, offset, handle.resource, 0, size);
     *     });
     *
     *     for (const vertices of model) {
     *         const view = new Float32Array(stream.write(bytesPerVertex * 3));
     *         view.set(vertices);
     *     }
     * }
     *
     * const pass = encoder.beginRenderPass(renderPassDesc);
     * pass.setPipeline(renderPipeline);
     *
     * for (const { handle, vertexCount } of borrowedVertexBuffers) {
     *     pass.setVertexBuffer(0, handle.resource, 0, vertexCount * bytesPerVertex);
     *     pass.draw(vertexCount, 1, 0, 0);
     *     handle.release();
     * }
     *
     * pass.end();
     *
     * device.queue.submit([encoder.finish()]);
     * ```
     *
     * Flushing should be done after streaming the data (so the callback will be called with leftover data). The
     * implemented `Disposable` interface also flushes the stream when disposing.
     *
     * @param maxSize Maximum number of bytes per callback call
     * @param callback Callback function
     * @returns Handle to stream data
     */
    stream(maxSize: number, callback: (slice: StagingBeltAllocation) => void): StagingBeltStream {
        let currentSlice: StagingBeltAllocation | null = null;

        function flush() {
            if (currentSlice == null) return;
            callback(currentSlice);
            currentSlice = null;
        }

        return {
            write: (size) => {
                const localSlice = this.allocate(size);

                if (
                    currentSlice != null && (
                        currentSlice.buffer != localSlice.buffer ||
                        currentSlice.size + size > maxSize
                    )
                ) {
                    flush();
                }

                if (currentSlice == null) {
                    currentSlice = localSlice;
                } else {
                    const localEnd = localSlice.offset + localSlice.size;
                    const nextSize = localEnd - currentSlice.offset;
                    currentSlice = { ...currentSlice, size: nextSize };
                }

                return localSlice.buffer.getMappedRange(localSlice.offset, localSlice.size);
            },

            flush,
            [Symbol.dispose]: flush,
        };
    }

    /**
     * Unmap all buffers whose small chunks are allocated into
     *
     * This must be called before the GPU command buffer created by GPU command encoder provided into {@link write} is
     * submitted, or before the command buffer that have the copy command from staging belt's buffer is submitted.
     * Otherwise a validation error will occurs when submitting the command buffers, because the buffers are still in
     * mapped state.
     */
    finish(): void {
        this.#pending.forEach(({ buffer }) => {
            buffer.unmap();
            this.#mapped.push(buffer);
        });

        this.#pending = [];
    }

    /**
     * Map all previously mapped buffers, recycling them for reuse
     *
     * This must only be called after the command buffer holding buffer copy commands is submitted. This may be called
     * right after the command buffer is submitted, though usually call to this function is located at the start of the
     * frame (before anything else used staging belt).
     *
     * **Note on `jsr:@gfx/dwm`**: The `mainloop()` from this package blocks Deno event loop, preventing staging belt
     * from receiving the mapped buffers; you have to use `pollEvents()` instead.
     */
    recall(): void {
        // TODO: track buffers that are still in mapping state
        // log warning when the number of buffers in mapping state is greater than some threshold
        // tell user that something is blocking async
        // you wouldn't believe I spent an hour tracing memory leak, only to find out `jsr:@gfx/dwm` was preventing
        // async

        this.#mapped.forEach((buffer) => {
            buffer.mapAsync(GPUMapMode.WRITE).then(() => this.#free.push(buffer));
        });

        this.#mapped = [];
    }

    /**
     * Destroy this staging belt
     *
     * This will destroy all kind of buffers, which includes currently free, pending and mapped buffers.
     */
    destroy(): void {
        this.#free.forEach((buffer) => buffer.destroy());
        this.#pending.forEach(({ buffer }) => buffer.destroy());
        this.#mapped.forEach((buffer) => buffer.destroy());
        this.#free = [];
        this.#pending = [];
        this.#mapped = [];
    }

    [Symbol.dispose](): void {
        this.destroy();
    }
}

export interface StagingBeltOptions {
    readonly device: GPUDevice;
    readonly chunkSize: number;
    readonly usage?: number;
    readonly alignment?: number;
    readonly cap?: number;
}

interface PendingBuffer {
    readonly buffer: GPUBuffer;
    used: number;
}

export interface StagingBeltAllocation {
    readonly buffer: GPUBuffer;
    readonly offset: number;
    readonly size: number;
}

export interface StagingBeltStream extends Disposable {
    write(size: number): ArrayBuffer;
    flush(): void;
}
