import { IPipeline } from "./pipeline.js";

export class EncoderPipeline implements IPipeline<VideoFrame, [EncodedVideoChunk, EncodedVideoChunkMetadata | undefined], any> {
    next?: (output: [EncodedVideoChunk, EncodedVideoChunkMetadata | undefined]) => any;
    encoder?: VideoEncoder;

    constructor(public readonly options: VideoEncoderConfig) {}

    async initialize(next: (output: [EncodedVideoChunk, EncodedVideoChunkMetadata | undefined]) => any): Promise<void> {
        this.next = next;
        this.encoder = new VideoEncoder({
            output: (chunk, meta) => next([chunk, meta]),
            error() {}
        });
        this.encoder.configure(this.options);
    }

    consume(input: VideoFrame): void {
        this.encoder!.encode(input);
        input.close();
    }

    async finalize(): Promise<any> {
        await this.encoder!.flush();
        console.log("EncoderPipeline: Flushed");
        this.encoder!.close();
    }
}