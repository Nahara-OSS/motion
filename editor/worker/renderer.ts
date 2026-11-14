import * as motion from "@nahara/motion";

export interface RendererCreateOptions {
}

export interface RenderOptions {
    readonly component: motion.runtime.Component | null;
    readonly background: readonly [r: number, g: number, b: number, a: number];
}

export class Renderer implements Disposable {
    #context: GPUCanvasContext | null = null;
    #graphics: motion.graphics.GraphicsEnv;
    #lifecycle = new motion.context.LifecycleContext();
    #cache = new motion.context.CacheContext();
    #viewportChangeHandlers = new Set<() => void>();

    private constructor(public readonly device: GPUDevice) {
        this.#graphics = new motion.graphics.GraphicsEnv({ device });

        console.log(
            `%cworker:renderer %cRenderer ready`,
            "color:rebeccapurple;font-weight:bold",
            "",
        );
    }

    static async create(options: RendererCreateOptions): Promise<Renderer> {
        const adapter = await navigator.gpu?.requestAdapter();
        if (adapter == null) throw new Error("Unable to create WebGPU adapter");
        const device = await adapter.requestDevice();
        return new Renderer(device);
    }

    setViewportCanvas(canvas: OffscreenCanvas, width: number, height: number): void;
    setViewportCanvas(canvas: null): void;
    setViewportCanvas(canvas: OffscreenCanvas | null, width: number = 0, height: number = 0): void {
        if (this.#context == canvas) return;

        if (this.#context != null) {
            this.#context.unconfigure();
            this.#context = null;

            console.log(
                `%cworker:renderer %cUnconfigured canvas`,
                "color:rebeccapurple;font-weight:bold",
                "",
            );
        }

        if (canvas != null) {
            canvas.width = Math.floor(width);
            canvas.height = Math.floor(height);
            const ctx = canvas.getContext("webgpu");
            if (ctx == null) throw new Error("Unable to get WebGPU canvas context");
            ctx.configure({ device: this.device, format: "rgba8unorm", alphaMode: "premultiplied" });
            this.#context = ctx;

            console.log(
                `%cworker:renderer %cConfigured canvas`,
                "color:rebeccapurple;font-weight:bold",
                "",
            );
        }

        this.#viewportChangeHandlers.forEach((handler) => handler());
    }

    resize(width: number, height: number): void {
        if (this.#context == null) return;
        width = Math.floor(width);
        height = Math.floor(height);
        if (this.#context.canvas.width == width && this.#context.canvas.height == height) return;
        this.#context.canvas.width = width;
        this.#context.canvas.height = height;
        this.#graphics.texturePool.compact();
        this.#viewportChangeHandlers.forEach((handler) => handler());

        console.log(
            `%cworker:renderer %cCanvas resized to ${width}*${height}`,
            "color:rebeccapurple;font-weight:bold",
            "",
        );
    }

    onViewportChange(callback: () => void): () => void {
        this.#viewportChangeHandlers.add(callback);
        return () => this.#viewportChangeHandlers.delete(callback);
    }

    async render(options: RenderOptions): Promise<void> {
        if (this.#context == null) return;

        const { component, background } = options;
        const { width, height } = this.#context.canvas;
        const encoder = this.device.createCommandEncoder();
        const colorTexture = this.#context.getCurrentTexture();
        using depthStencil = this.#graphics.texturePool.borrow({
            width,
            height,
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        const context = motion.context.ContextMap
            .builder()
            .with(motion.context.LifecycleContext, this.#lifecycle)
            .with(motion.context.CacheContext, this.#cache)
            .with(motion.context.GraphicsContext, new motion.context.GraphicsContext(this.#graphics, encoder))
            .with(motion.context.LayerContext, new motion.context.LayerContext(colorTexture, depthStencil.resource))
            .with(
                motion.context.CameraContext,
                new motion.context.CameraContext(
                    motion.math.Matrix4.projection2D(width, height),
                    motion.math.Matrix4.IDENTITY,
                ),
            )
            .with(
                motion.context.ModelContext,
                new motion.context.ModelContext(motion.math.Matrix4.IDENTITY),
            )
            .build();

        const clearPass = encoder.beginRenderPass({
            label: "Clear pass",
            colorAttachments: [
                {
                    view: colorTexture.createView(),
                    loadOp: "clear",
                    storeOp: "store",
                    clearValue: [...background],
                },
            ],
            depthStencilAttachment: {
                view: depthStencil.resource.createView(),
                depthReadOnly: false,
                depthLoadOp: "clear",
                depthStoreOp: "store",
                depthClearValue: 0,
                stencilReadOnly: false,
                stencilLoadOp: "clear",
                stencilStoreOp: "store",
                stencilClearValue: 0,
            },
        });
        clearPass.end();

        this.#graphics.beginFrame();

        if (component) {
            await component.info.eval({
                context,
            });
        }

        this.#lifecycle.endFrame();
        this.#graphics.endFrame();
        this.device.queue.submit([encoder.finish()]);
    }

    close(): void {
        this.#graphics.destroy();
        this.#cache.destroy();
        this.setViewportCanvas(null);
        this.device.destroy();

        console.log(
            `%cworker:renderer %cDestroyed`,
            "color:rebeccapurple;font-weight:bold",
            "",
        );
    }

    [Symbol.dispose](): void {
        this.close();
    }
}
