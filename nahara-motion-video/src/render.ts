import { BaseCanvasRenderingContext2D, IScene } from "@nahara/motion";
import { IPipeline } from "./pipeline.js";

export class SceneRenderPipeline implements IPipeline<IScene, VideoFrame, any> {
    next?: (output: VideoFrame) => any;
    canvas?: OffscreenCanvas;
    ctx?: BaseCanvasRenderingContext2D;

    constructor(
        public readonly width: number,
        public readonly height: number,
        public readonly frameRate: number,
        public readonly frames: number
    ) {}

    async initialize(next: (output: VideoFrame) => any): Promise<void> {
        this.next = next;
        this.canvas = new OffscreenCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext("2d")!;
    }

    consume(input: IScene): void {
        for (let f = 0; f < this.frames; f++) {
            const timestamp = Math.floor(f * 1000000 / this.frameRate);
            const delta = Math.floor((f + 1) * 1000000 / this.frameRate) - timestamp;
            
            this.ctx!.reset();
            this.ctx!.fillStyle = "#000";
            this.ctx!.fillRect(0, 0, this.width, this.height);
            input.renderFrame({
                canvas: this.ctx!,
                containerSize: { x: this.width, y: this.height },
                time: timestamp / 1000,
                timeDelta: delta / 1000
            });
            const frame = new VideoFrame(this.canvas!, { timestamp, duration: delta });
            this.next!(frame);
        }
    }

    async finalize(): Promise<any> {
    }
}