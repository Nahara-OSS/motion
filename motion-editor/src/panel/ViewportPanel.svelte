<script lang="ts">
    import { of, switchMap } from "rxjs";
    import Button from "../component/Button.svelte";
    import IconLabel from "../component/IconLabel.svelte";
    import KeybindLabel from "../component/KeybindLabel.svelte";
    import Panel from "../component/Panel.svelte";
    import TextLabel from "../component/TextLabel.svelte";
    import { getEditorSession } from "../editor";
    import { devicePixelRatioAsObservable } from "../util/trackZoom";
    import KeyCombinationName from "../component/KeyCombinationName.svelte";
    import Translation from "../util/Translation.svelte";

    const editor = getEditorSession();
    const keybind = editor.keybind;
    const graphicsSeekhead = editor.project.pipe(
        switchMap((project) => project?.scene ?? of(null)),
        switchMap((scene) => scene?.graphicsSeekhead$ ?? of(0)),
    );

    let canvas = $state<HTMLCanvasElement | null>(null);
    let context = $state<GPUCanvasContext | null>(null);
    let cssWidth = $state<number>(1);
    let cssHeight = $state<number>(1);
    const devicePixelRatio = devicePixelRatioAsObservable();
    const width = $derived(cssWidth * $devicePixelRatio);
    const height = $derived(cssHeight * $devicePixelRatio);

    $effect(() => {
        if (canvas != null) {
            context = canvas.getContext("webgpu") as GPUCanvasContext;
        }
    });

    $effect(() => {
        if (context != null) {
            context.configure({
                device: editor.gpu,
                format: navigator.gpu.getPreferredCanvasFormat(),
                alphaMode: "premultiplied",
                colorSpace: "srgb",
                toneMapping: { mode: "standard" },
            });
        }
    });
</script>

<Panel>
    <canvas bind:this={canvas} bind:clientWidth={cssWidth} bind:clientHeight={cssHeight} {width} {height}></canvas>
    <div class="toolbar">
        <Button style="toolbar" toggled={true}>
            {#snippet tooltip()}
                <TextLabel>
                    <Translation key="tools.pointer" />
                </TextLabel>
                <KeybindLabel>
                    {#each $keybind.tools.pointer as key}
                        <KeyCombinationName {key} />
                    {/each}
                </KeybindLabel>
            {/snippet}
            <IconLabel type="pointer" />
        </Button>
        <Button style="toolbar">
            {#snippet tooltip()}
                <TextLabel>
                    <Translation key="tools.shape" />
                </TextLabel>
                <KeybindLabel>
                    {#each $keybind.tools.shape as key}
                        <KeyCombinationName {key} />
                    {/each}
                </KeybindLabel>
            {/snippet}
            <IconLabel type="shapes" />
        </Button>
        <Button style="toolbar">
            {#snippet tooltip()}
                <TextLabel>
                    <Translation key="tools.path" />
                </TextLabel>
                <KeybindLabel>
                    {#each $keybind.tools.path as key}
                        <KeyCombinationName {key} />
                    {/each}
                </KeybindLabel>
            {/snippet}
            <IconLabel type="path" />
        </Button>
        <Button style="toolbar">
            {#snippet tooltip()}
                <TextLabel>
                    <Translation key="tools.text" />
                </TextLabel>
                <KeybindLabel>
                    {#each $keybind.tools.text as key}
                        <KeyCombinationName {key} />
                    {/each}
                </KeybindLabel>
            {/snippet}
            <IconLabel type="text" />
        </Button>
    </div>
</Panel>

<style>
    canvas,
    .toolbar {
        position: absolute;
    }

    canvas {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .toolbar {
        background-color: #ffffff;
        left: 0.5rem;
        top: 50%;
        translate: 0 calc(-50% + 0.5px);
        display: flex;
        flex-direction: column;
        padding: 0.2rem;
        gap: 0.2rem;
        border: 1px solid #9f9f9f;
    }
</style>
