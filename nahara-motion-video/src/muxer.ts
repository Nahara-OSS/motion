import { ArrayBufferTarget, Muxer, MuxerOptions } from "mp4-muxer";
import { IPipeline } from "./pipeline.js";

export class MuxerPipeline implements IPipeline<[EncodedVideoChunk, EncodedVideoChunkMetadata | undefined], void, ArrayBuffer> {
    muxer?: Muxer<ArrayBufferTarget>;

    constructor(public readonly options: (MuxerOptions<any>["video"] & {})) {}

    async initialize(): Promise<void> {
        this.muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: this.options,
            fastStart: "fragmented"
        });
    }

    consume(input: [EncodedVideoChunk, EncodedVideoChunkMetadata | undefined]): void {
        this.muxer!.addVideoChunk(...input);
    }

    async finalize(): Promise<ArrayBuffer> {
        console.log("MuxerPipeline: Finalizing...");
        this.muxer!.finalize();
        return this.muxer!.target.buffer;
    }
}