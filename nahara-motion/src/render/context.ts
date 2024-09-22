import { BaseCanvasRenderingContext2D, Vec2 } from "../types.js";

export interface RenderContext {
    /**
     * The current time of the current frame. When rendering to video, the delta between current and previous frame is
     * constant.
     */
    readonly time: number;

    /**
     * The delta time of current and previous frame. When rendering to video, the delta between current and previous
     * frame is constant. When seeking in editor, the value may be negative, which indicates user have seeked backward,
     * or playing the animation in backward.
     */
    readonly timeDelta: number;

    /**
     * The size of current container. The container can be a scene or a group of objects that is represented as a single
     * scene object.
     */
    readonly containerSize: Vec2;

    // We'll use 2D context for now
    // We'll figure out WebGPU/WebGL for more advanced effect and technique, like instancing for example
    /**
     * The output context for graphical scene objects. The `(0; 0)` coordinates is the origin of the container, which is
     * also the top-left corner, and `constainerSize` is the bottom-right of the container.
     * 
     * The reported size of the canvas (`canvas.canvas.width` or `canvas.canvas.height`) may not report the exact size
     * of the current container. If you want to get the container size, consider using `containerSize`. However, you may
     * use the canvas size if you want to put the scene object in fixed position on the _screen_. Only do that for
     * debugging purpose.
     */
    readonly canvas: BaseCanvasRenderingContext2D;
}