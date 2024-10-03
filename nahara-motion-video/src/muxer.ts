import { ArrayBufferTarget, Muxer, MuxerOptions, StreamTarget } from "mp4-muxer";
import { IPipeline } from "./pipeline.js";

export class MuxerPipeline implements IPipeline<[EncodedVideoChunk, EncodedVideoChunkMetadata | undefined], void, Blob> {
    muxer?: Muxer<StreamTarget>;
    collector?: Blob[];

    constructor(public readonly options: (MuxerOptions<any>["video"] & {})) {}

    async initialize(): Promise<void> {
        this.collector = [];
        this.muxer = new Muxer({
            target: new StreamTarget({
                chunked: true,
                onData: (data, _) => this.collector!.push(new Blob([data]))
            }),
            video: this.options,
            fastStart: "fragmented"
        });
    }

    consume(input: [EncodedVideoChunk, EncodedVideoChunkMetadata | undefined]): void {
        this.muxer!.addVideoChunk(...input);
    }

    async finalize(): Promise<Blob> {
        console.log("MuxerPipeline: Finalizing...");
        this.muxer!.finalize();
        const result = new Blob(this.collector!);
        this.collector = [];
        return result;
    }
}