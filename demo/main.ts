import * as motion from "@nahara/motion";
import * as stdlib from "@nahara/motion-stdlib";
import * as webgpu from "@nahara/webgpu";
import * as geometry from "@nahara/geometry";
import * as hb from "harfbuzzjs";

const arrayBuffer = await Deno.readFile("/usr/share/fonts/noto-cjk/NotoSerifCJK-Regular.ttc");
const blob = new hb.Blob(arrayBuffer);
const face = new hb.Face(blob);
const font = new hb.Font(face);
font.setScale(256, 256);

const buffer = new hb.Buffer();
buffer.addText("あなたの手を");
buffer.guessSegmentProperties();
hb.shape(font, buffer);

const infos = buffer.getGlyphInfos();
const positions = buffer.getGlyphPositions();
const penCommands: geometry.path.PenCommand[] = [];
let pointer = 0;

for (const [index, glyph] of infos.entries()) {
    const gid = glyph.codepoint;
    const hbCommands = font.glyphToJson(gid);
    const { xAdvance } = positions[index];
    const commands = hbCommands.map<geometry.path.PenCommand>(({ type, values }) => {
        switch (type) {
            case "M": {
                const [x, y] = values;
                return {
                    type: "move",
                    target: [pointer + x, y],
                };
            }

            case "L": {
                const [x, y] = values;
                return {
                    type: "line",
                    target: [pointer + x, y],
                };
            }

            case "Q": {
                const [cx, cy, x, y] = values;
                return {
                    type: "quadratic",
                    cp: [pointer + cx, cy],
                    target: [pointer + x, y],
                };
            }

            case "C": {
                const [c1x, c1y, c2x, c2y, x, y] = values;
                return {
                    type: "cubic",
                    cp1: [pointer + c1x, c1y],
                    cp2: [pointer + c2x, c2y],
                    target: [pointer + x, y],
                };
            }

            case "Z": {
                return { type: "close" };
            }

            default: {
                throw new Error(`Unknown path command: ${type} ${values.join(", ")}`);
            }
        }
    });
    penCommands.push(...commands);
    pointer += xAdvance;
}

const path = [...geometry.path.penCommandsToPath(penCommands)];
const triangleCount = path.reduce((acc, path) => acc + path.segments.length, 0);
const vertexCount = triangleCount * 3;

const adapter = await navigator.gpu.requestAdapter();
if (adapter == null) throw new Error("No GPU found");

const device = await adapter.requestDevice();
device.pushErrorScope("validation");

const canvas = new OffscreenCanvas(1920, 480);
const ctx = canvas.getContext("webgpu")!;
ctx.configure({ device, format: "rgba8unorm" });

const sampleCount = 4;

const uniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 16,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
});

device.queue.writeBuffer(
    uniformBuffer,
    0,
    motion.math.Matrix4.mul(
        motion.math.Matrix4.projection2D(canvas.width, canvas.height),
        motion.math.Matrix4.translate(-canvas.width / 2, 0, 0),
    ).toFloat32Array(),
);

const vertexBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 2 * vertexCount,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
});

const vertexCpuBuffer = new Float32Array(2 * vertexCount);
pointer = 0;
for (const p of path) {
    for (const { start: [x1, y1], end: [x2, y2] } of p.segments) {
        vertexCpuBuffer[pointer + 0] = 0;
        vertexCpuBuffer[pointer + 1] = 0;
        vertexCpuBuffer[pointer + 2] = x1;
        vertexCpuBuffer[pointer + 3] = y1;
        vertexCpuBuffer[pointer + 4] = x2;
        vertexCpuBuffer[pointer + 5] = y2;
        pointer += 6;
    }
}
device.queue.writeBuffer(vertexBuffer, 0, vertexCpuBuffer);

const color = device.createTexture({
    format: "rgba8unorm",
    size: { width: canvas.width, height: canvas.height },
    sampleCount,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TRANSIENT_ATTACHMENT,
});

const stencil = device.createTexture({
    format: "stencil8",
    size: { width: canvas.width, height: canvas.height },
    sampleCount,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const bgLayout = device.createBindGroupLayout({
    entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
    ],
});

const bg = device.createBindGroup({
    layout: bgLayout,
    entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
    ],
});

const stencilPipeline = device.createRenderPipeline({
    label: "Stencil",
    layout: device.createPipelineLayout({
        bindGroupLayouts: [bgLayout],
    }),
    primitive: {
        topology: "triangle-list",
    },
    vertex: {
        module: device.createShaderModule({
            code: `
                @group(0) @binding(0) var<uniform> transform: mat4x4<f32>;

                @vertex
                fn vertexMain(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
                    return transform * vec4<f32>(position, 0.0, 1.0);
                }
            `,
        }),
        buffers: [
            {
                stepMode: "vertex",
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
                attributes: [
                    { shaderLocation: 0, format: "float32x2", offset: 0 },
                ],
            },
        ],
    },
    depthStencil: {
        format: "stencil8",
        depthWriteEnabled: false,
        stencilReadMask: 0x00,
        stencilWriteMask: 0xFF,
        stencilBack: {
            compare: "always",
            depthFailOp: "keep",
            failOp: "keep",
            passOp: "decrement-wrap",
        },
        stencilFront: {
            compare: "always",
            depthFailOp: "keep",
            failOp: "keep",
            passOp: "increment-wrap",
        },
    },
    multisample: {
        count: sampleCount,
    },
});

const coverShader = device.createShaderModule({
    label: "Cover",
    code: `
        @vertex
        fn vertexMain(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4<f32> {
            const vertices = array(
                vec4<f32>(-1.0,  1.0, 0.0, 1.0),
                vec4<f32>( 1.0,  1.0, 0.0, 1.0),
                vec4<f32>(-1.0, -1.0, 0.0, 1.0),
                vec4<f32>( 1.0, -1.0, 0.0, 1.0),
            );
            return vertices[vi];
        }

        @fragment
        fn fragmentMain() -> @location(0) vec4<f32> {
            return vec4<f32>(1.0, 0.0, 0.0, 1.0);
        }
    `,
});

const coverPipeline = device.createRenderPipeline({
    layout: "auto",
    primitive: {
        topology: "triangle-strip",
    },
    vertex: {
        module: coverShader,
    },
    depthStencil: {
        format: "stencil8",
        depthWriteEnabled: false,
        stencilReadMask: 0xFF,
        stencilWriteMask: 0x00,
        stencilBack: {
            compare: "not-equal",
            depthFailOp: "keep",
            failOp: "keep",
            passOp: "keep",
        },
        stencilFront: {
            compare: "not-equal",
            depthFailOp: "keep",
            failOp: "keep",
            passOp: "keep",
        },
    },
    fragment: {
        module: coverShader,
        targets: [{ format: "rgba8unorm" }],
    },
    multisample: {
        count: 4,
    },
});

const encoder = device.createCommandEncoder();
const stencilPass = encoder.beginRenderPass({
    colorAttachments: [],
    depthStencilAttachment: {
        view: stencil.createView(),
        stencilReadOnly: false,
        stencilLoadOp: "clear",
        stencilStoreOp: "store",
        stencilClearValue: 0,
    },
});
stencilPass.setPipeline(stencilPipeline);
stencilPass.setBindGroup(0, bg);
stencilPass.setVertexBuffer(0, vertexBuffer);
stencilPass.draw(vertexCount);
stencilPass.end();
const coverPass = encoder.beginRenderPass({
    colorAttachments: [{
        view: color.createView(),
        resolveTarget: ctx.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: [0, 0, 0, 0],
    }],
    depthStencilAttachment: {
        view: stencil.createView(),
        stencilReadOnly: true,
    },
});
coverPass.setPipeline(coverPipeline);
coverPass.draw(4);
coverPass.end();
device.queue.submit([encoder.finish()]);

const pngBlob = await canvas.convertToBlob({ type: "image/png" });
const pngData = await pngBlob.bytes();
await Deno.writeFile("image.png", pngData);

console.log(await device.popErrorScope());
