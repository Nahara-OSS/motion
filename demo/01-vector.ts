import * as motion from "@nahara/motion";
import * as stdlib from "@nahara/motion-stdlib";
import * as geometry from "@nahara/geometry";
import { createWindow, pollEvents } from "@gfx/dwm";

const adapter = await navigator.gpu.requestAdapter();
const device = await adapter!.requestDevice();
const window = createWindow({ width: 1920, height: 1080 });
const global = new motion.env.GlobalEnv();
const graphics = new motion.env.GraphicsEnv({ device, validate: true });
const canvas = window.windowSurface();
const ctx = canvas.getContext("webgpu") as GPUCanvasContext;
ctx.configure({ device, format: navigator.gpu.getPreferredCanvasFormat() });

while (true) {
    pollEvents();
    device.pushErrorScope("validation");
    global.beginFrame();
    graphics.beginFrame();
    const encoder = device.createCommandEncoder();
    const context = motion.context.ContextMap.builder()
        .with(new motion.context.GlobalContext(global))
        .with(new motion.context.GraphicsContext(graphics, encoder, ctx.getCurrentTexture()))
        .build();

    const clearPass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: ctx.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
                clearValue: [0, 0, 0, 0],
            },
        ],
    });
    clearPass.end();

    await stdlib.graphics.Vector.render([], context, {
        paths: () => (<stdlib.path.Path[]> [...geometry.path.penCommandsToPath([
            { type: "move", target: [-300, +300] },
            { type: "line", target: [+300, +300] },
            { type: "line", target: [+300, -300] },
            { type: "line", target: [-300, -300] },
        ])]),
        fillStyle: () => (<stdlib.graphics.FillStyle> {
            option: "Graphics",
            data: null,
        }),
    }, {
        fillGraphics: async (context) => {
            await stdlib.graphics.Vector.render([], context, {
                paths: () => (<stdlib.path.Path[]> [...geometry.path.penCommandsToPath([
                    { type: "move", target: [-500, 0] },
                    { type: "cubic", cp1: [0, +500], cp2: [0, -500], target: [+500, 0] },
                ])]),
                fillStyle: () => (<stdlib.graphics.FillStyle> {
                    option: "Solid",
                    data: [1, 0, 0],
                }),
            }, {});
        },
    });

    global.endFrame();
    graphics.endFrame();
    device.queue.submit([encoder.finish()]);
    canvas.present();
    console.log(await device.popErrorScope());
    await new Promise((r) => setTimeout(r, 1));
}
