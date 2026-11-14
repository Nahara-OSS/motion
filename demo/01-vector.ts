import * as motion from "@nahara/motion";
import * as stdlib from "@nahara/motion-stdlib";
import { encodePNG } from "@img/png";

const adapter = await navigator.gpu.requestAdapter();
if (adapter == null) throw new Error("No GPU found");

const device = await adapter.requestDevice();
device.pushErrorScope("validation");

const finalTexture = device.createTexture({
    format: "rgba8unorm",
    size: { width: 1024, height: 1024 },
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
});

const textureBuffer = device.createBuffer({
    size: finalTexture.width * finalTexture.height * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});

const hookContext = new motion.context.LifecycleContext();
using cacheContext = new motion.context.CacheContext();
using env = new motion.graphics.GraphicsEnv({ device });
using depthStencil = env.texturePool.borrow({
    width: finalTexture.width,
    height: finalTexture.height,
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const encoder = device.createCommandEncoder();
env.beginFrame();
await stdlib.graphics.Vector.info.eval({
    context: motion.context.ContextMap.builder()
        .with(motion.context.LifecycleContext, hookContext)
        .with(motion.context.CacheContext, cacheContext)
        .with(
            motion.context.GraphicsContext,
            new motion.context.GraphicsContext(env, encoder),
        )
        .with(
            motion.context.LayerContext,
            new motion.context.LayerContext(finalTexture, depthStencil.resource),
        )
        .with(
            motion.context.CameraContext,
            new motion.context.CameraContext(
                motion.math.Matrix4.projection2D(1024, 1024),
                motion.math.Matrix4.IDENTITY,
            ),
        )
        .with(
            motion.context.ModelContext,
            new motion.context.ModelContext(motion.math.Matrix4.IDENTITY),
        )
        .build(),
    parameters: {
        transform: () => (stdlib.math.combinedTransform.info.apply(
            [],
            [0, 0],
            [0, 0],
            // Math.PI / 6,
            0,
            [1, 1],
        )),
        path: () => ([
            { option: "Move", data: [0, 500] },
            { option: "Quadratic", data: { cp: [+500, +500], target: [+500, 0] } },
            { option: "Quadratic", data: { cp: [+500, -500], target: [0, -500] } },
            { option: "Quadratic", data: { cp: [-500, -500], target: [-500, 0] } },
            { option: "Quadratic", data: { cp: [-500, +500], target: [0, +500] } },
            { option: "Move", data: [0, 400] },
            { option: "Quadratic", data: { cp: [0, 0], target: [-400, 0] } },
            { option: "Quadratic", data: { cp: [0, 0], target: [0, -400] } },
            { option: "Quadratic", data: { cp: [0, 0], target: [+400, 0] } },
            { option: "Quadratic", data: { cp: [0, 0], target: [0, +400] } },
        ] satisfies stdlib.graphics.PathCommand[]),
        fill: () => ({
            option: "Graphics",
            data: null,
        } satisfies stdlib.graphics.Fill),
        alpha: () => 1,
    },
    slots: {
        fillGraphics: async (ctx) => {
            await stdlib.graphics.Vector.info.eval({
                context: ctx,
                parameters: {
                    path: () => ([
                        { option: "Move", data: [-450, +450] },
                        { option: "Line", data: [+450, +450] },
                        { option: "Line", data: [+450, -450] },
                        { option: "Line", data: [-450, -450] },
                    ] satisfies stdlib.graphics.PathCommand[]),
                    fill: () => ({
                        option: "Solid",
                        data: {
                            red: 1,
                            green: 0,
                            blue: 0,
                        },
                    } satisfies stdlib.graphics.Fill),
                    alpha: () => 1,
                },
            });
            await stdlib.graphics.Vector.info.eval({
                context: ctx,
                parameters: {
                    path: () => ([
                        { option: "Move", data: [-400, +400] },
                        { option: "Line", data: [+400, +400] },
                        { option: "Line", data: [+400, -400] },
                        { option: "Line", data: [-400, -400] },
                    ] satisfies stdlib.graphics.PathCommand[]),
                    fill: () => ({
                        option: "Solid",
                        data: {
                            red: 0,
                            green: 1,
                            blue: 0,
                        },
                    } satisfies stdlib.graphics.Fill),
                    blend: () => ({
                        option: "Normal",
                        data: null,
                    } satisfies stdlib.graphics.Blend),
                    alpha: () => 1,
                },
            });
        },
    },
});
env.endFrame();
hookContext.endFrame();
encoder.copyTextureToBuffer(
    { texture: finalTexture },
    { buffer: textureBuffer, bytesPerRow: finalTexture.width * 4 },
    { width: finalTexture.width, height: finalTexture.height },
);
device.queue.submit([encoder.finish()]);

console.log(await device.popErrorScope());
await textureBuffer.mapAsync(GPUMapMode.READ);
const png = await encodePNG(new Uint8Array(textureBuffer.getMappedRange()), {
    width: finalTexture.width,
    height: finalTexture.height,
    compression: 0,
    filter: 0,
    interlace: 0,
});
textureBuffer.unmap();
await Deno.writeFile("image.png", png);
console.log("write done");
