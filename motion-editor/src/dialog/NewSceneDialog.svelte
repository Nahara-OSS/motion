<script lang="ts" module>
    export interface NewSceneOptions {
        readonly name: string;
        readonly startTick: number;
        readonly endTick: number;
        readonly tickRate: number;
        readonly width: number;
        readonly height: number;
        readonly fps: number;
    }
</script>

<script lang="ts">
    import { timing } from "@nahara/motion";
    import Button from "../component/Button.svelte";
    import Dialog from "../component/Dialog.svelte";
    import TextField, { type ValidateResult } from "../component/TextField.svelte";
    import TextLabel from "../component/TextLabel.svelte";

    const {
        onDismiss,
        onConfirm,
    }: {
        onDismiss: () => unknown;
        onConfirm: (options: NewSceneOptions) => unknown;
    } = $props();

    let focusTarget = $state<HTMLInputElement | null>(null);

    let name = $state("Untitled scene");
    let width = $state("1920");
    let height = $state("1080");
    let startSecond = $state("0");
    let endSecond = $state("10");
    let fps = $state("24");

    const nameValidation = $derived(validateName(name));
    const widthValidation = $derived(validateResolution(width));
    const heightValidation = $derived(validateResolution(height));
    const startValidation = $derived(validateTime(startSecond));
    const endValidation = $derived(validateTime(endSecond));
    const rangeValidation = $derived(
        startValidation == null && endValidation == null && +startSecond >= +endSecond
            ? ({ level: "error", message: "Start time must be before end time" } as ValidateResult)
            : null,
    );
    const fpsValidation = $derived(validateFps(fps));

    const valid = $derived(
        [nameValidation, widthValidation, heightValidation, startValidation, endValidation, fpsValidation].every(
            (v) => v == null || v.level != "error",
        ),
    );

    function validateName(name: string): ValidateResult | null {
        if (name.trim() == "") return { level: "error", message: "Name cannot be empty" };
        if (name.match(/[\\/<>:"'|?*]/g)) return { level: "error", message: "Name contains invalid character(s)" };
        if ([".", ".."].includes(name)) return { level: "error", message: "File with this name is not allowed" };
        return null;
    }

    function validateResolution(value: string): ValidateResult | null {
        if (value.trim() == "") return { level: "error", message: "Value cannot be empty" };
        if (!value.match(/^[0-9]+$/)) return { level: "error", message: "Value must only contain digits" };
        return null;
    }

    function validateTime(value: string): ValidateResult | null {
        if (value.trim() == "") return { level: "error", message: "Value cannot be empty" };
        if (Number.isNaN(+value)) return { level: "error", message: "Invalid value" };
        if (+value < 0) return { level: "info", message: "Time usually starts from 0" };
        return null;
    }

    function validateFps(value: string): ValidateResult | null {
        if (value.trim() == "") return { level: "error", message: "Value cannot be empty" };
        if (Number.isNaN(+value)) return { level: "error", message: "Invalid value" };

        const rate = timing.TICKS_PER_SECOND / +value;

        if (rate - Math.floor(rate)) {
            return { level: "warn", message: "Frame rate misaligned with internal clock" };
        }

        return null;
    }

    function onConfirmClick() {
        if (!valid) return;

        onConfirm({
            name,
            startTick: +startSecond * timing.TICKS_PER_SECOND,
            endTick: +endSecond * timing.TICKS_PER_SECOND,
            tickRate: timing.TICKS_PER_SECOND,
            width: +width,
            height: +height,
            fps: +fps,
        });
    }

    $effect(() => queueMicrotask(() => focusTarget?.focus()));
</script>

<Dialog {onDismiss}>
    {#snippet label()}
        <TextLabel>New scene</TextLabel>
    {/snippet}
    <div class="content">
        <div class="label"><TextLabel>Scene name</TextLabel></div>
        <TextField
            bind:inputElement={focusTarget}
            value={name}
            validation={nameValidation}
            onValueChange={(value) => (name = value)}
        />
        <div class="row">
            <div class="col">
                <div class="label"><TextLabel>Start time (s)</TextLabel></div>
                <TextField
                    value={startSecond}
                    validation={startValidation ?? rangeValidation}
                    onValueChange={(value) => (startSecond = value)}
                />
            </div>
            <div class="col">
                <div class="label"><TextLabel>End time (s)</TextLabel></div>
                <TextField
                    value={endSecond}
                    validation={endValidation ?? rangeValidation}
                    onValueChange={(value) => (endSecond = value)}
                />
            </div>
            <div class="col">
                <div class="label"><TextLabel>Tick rate (tick/s)</TextLabel></div>
                <TextField value={`${timing.TICKS_PER_SECOND}`} enabled={false} onValueChange={() => {}} />
            </div>
        </div>
        <div class="row">
            <div class="col">
                <div class="label"><TextLabel>Width</TextLabel></div>
                <TextField value={width} validation={widthValidation} onValueChange={(value) => (width = value)} />
            </div>
            <div class="col">
                <div class="label"><TextLabel>Height</TextLabel></div>
                <TextField value={height} validation={heightValidation} onValueChange={(value) => (height = value)} />
            </div>
            <div class="col">
                <div class="label"><TextLabel>Frame rate (frame/s)</TextLabel></div>
                <TextField value={fps} validation={fpsValidation} onValueChange={(value) => (fps = value)} />
            </div>
        </div>
    </div>
    {#snippet actions()}
        <Button onClick={onConfirmClick} enabled={valid}>
            <TextLabel>Confirm</TextLabel>
        </Button>
    {/snippet}
</Dialog>

<style>
    .content {
        width: 40rem;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .label {
            display: flex;
            flex-direction: row;
            padding: 0.2rem;
            gap: 0.2rem;
            height: 2rem;
            box-sizing: border-box;
            align-items: center;
        }

        .row {
            display: flex;
            flex-direction: row;
            gap: 0.5rem;

            > :global(*) {
                width: 0;
                flex-grow: 1;
            }
        }

        .col {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
    }
</style>
