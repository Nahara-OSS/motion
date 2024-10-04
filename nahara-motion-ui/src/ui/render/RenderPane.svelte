<script lang="ts">
    import { concat, EncoderPipeline, MuxerPipeline, SceneRenderPipeline, type IPipeline } from "@nahara/motion-video";
    import { app } from "../../appglobal";
    import Button from "../input/Button.svelte";
    import Dropdown from "../input/Dropdown.svelte";
    import { openMenuAt } from "../menu/MenuHost.svelte";
    import Property from "../properties/Property.svelte";
    import PropertyValuePart from "../properties/PropertyValuePart.svelte";
    import type { IScene } from "@nahara/motion";

    interface EncoderProfile {
        profile: string;
        name: string;
        maximumKbps: number;
    }

    interface EncoderType {
        type: string;
        name: string;
        profiles: EncoderProfile[];
    }

    const Encoders: EncoderType[] = [
        {
            type: "avc",
            name: "Advanced Video Codec (H.264)",
            profiles: [
                { profile: "avc1.4d0028", name: "Main Profile", maximumKbps: 20_000 }
            ]
        }
    ];

    export let scene: IScene = app.getCurrentScene()!;

    export let saveAs = "scene.mp4";
    export let resWidth = 1920;
    export let resHeight = 1080;
    export let fps = 60;
    export let duration = 10;

    export let encoder = Encoders[0];
    export let encoderProfile = encoder.profiles[0];
    export let kbitRate = 10_000;

    let rendering = false;

    export async function beginRender() {
        const pipeline: IPipeline<IScene, any, [any, any, Blob]> = concat(
            new SceneRenderPipeline(
                resWidth,
                resHeight,
                fps, Math.max(fps * duration, 1)
            ),
            new EncoderPipeline({
                codec: encoderProfile.profile,
                width: resWidth,
                height: resHeight,
                bitrate: kbitRate * 1000,
                framerate: fps
            }),
            new MuxerPipeline({
                codec: "avc",
                width: resWidth,
                height: resHeight,
                frameRate: fps
            })
        );

        rendering = true;
        await pipeline.initialize(console.log);
        pipeline.consume(scene);

        const result = await pipeline.finalize();
        const blob = result[2];
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = saveAs;
        downloadLink.click();
        URL.revokeObjectURL(downloadLink.href);
        rendering = false;
    }
</script>

<div>
    <table>
        <tr>
            <th scope="row">General options</th>
        </tr>
        <Property name="Save as" value={saveAs} on:update={e => saveAs = e.detail} />
        <tr>
            <th scope="row">Renderer options</th>
        </tr>
        <tr>
            <th scope="row">Resolution</th>
            <td><PropertyValuePart
                name="Width" value={resWidth} min={1} max={10_000_000}
                on:update={e => resWidth = e.detail}
            /></td>
        </tr>
        <tr>
            <td></td>
            <td><PropertyValuePart
                name="Height" value={resHeight} min={1} max={10_000_000}
                on:update={e => resHeight = e.detail}
            /></td>
        </tr>
        <tr>
            <th scope="row">Frames per second</th>
            <td><PropertyValuePart
                name="FPS" value={fps} min={1}
                on:update={e => fps = e.detail}
            /></td>
        </tr>
        <tr>
            <th scope="row">Duration (seconds)</th>
            <td><PropertyValuePart
                name="Sec" value={duration} min={0.001}
                on:update={e => duration = e.detail}
            /></td>
        </tr>
        <tr>
            <th scope="row">Encoder options</th>
        </tr>
        <tr>
            <th scope="row">Encoder</th>
            <td><Dropdown label={encoder.name} on:click={e => openMenuAt(e.clientX, e.clientY, Encoders.map(v => ({
                type: "simple",
                name: v.name,
                click() {
                    if (encoder == v) return;
                    encoder = v;
                    encoderProfile = v.profiles[0];
                },
            })))} /></td>
        </tr>
        <tr>
            <th scope="row">Profile</th>
            <td><Dropdown label={encoderProfile.name} on:click={e => openMenuAt(e.clientX, e.clientY, encoder.profiles.map(v => ({
                type: "simple",
                description: `${v.maximumKbps} kbps max`,
                name: v.name,
                click() {
                    if (encoderProfile == v) return;
                    encoderProfile = v;
                }
            })))} /></td>
        </tr>
        <tr>
            <th scope="row">Bitrate (kbps)</th>
            <td><PropertyValuePart
                name="Kbps" value={kbitRate} min={1} max={encoderProfile.maximumKbps}
                on:update={e => kbitRate = e.detail}
            /></td>
        </tr>
        <tr>
            <th scope="row">Actions</th>
            <td><Button label="Render and download" disabled={rendering} on:click={beginRender} /></td>
        </tr>
    </table>
</div>

<style lang="scss">
    table {
        margin: 0;
        border-spacing: 0;

        td {
            padding: 0;
        }

        th[scope="row"] {
            text-align: left;
            min-width: 100px;
            font-weight: normal;
            padding: 0 16px 0 8px;
            height: 24px;
        }
    }
</style>