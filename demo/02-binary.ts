import * as motion from "@nahara/motion";
import * as binFmt from "@nahara/motion-binary";

function create(): [WritableStream<Uint8Array>, Promise<ReadableStream<Uint8Array>>] {
    const { promise, resolve, reject } = Promise.withResolvers<ReadableStream<Uint8Array>>();
    const chunks: Uint8Array<ArrayBuffer>[] = [];

    const writable = new WritableStream<Uint8Array<ArrayBuffer>>({
        write: (chunk) => {
            chunks.push(new Uint8Array(chunk));
        },

        close: async () => {
            const blob = new Blob(chunks);
            const readable = blob.stream();
            console.log((await blob.bytes()).toHex());
            resolve(readable);
        },

        abort: (reason) => {
            reject(reason);
        },
    });

    return [writable, promise];
}
