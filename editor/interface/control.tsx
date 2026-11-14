import type {
    ButtonHTMLAttributes,
    ComponentChildren,
    ComponentType,
    InputHTMLAttributes,
    Ref,
    TargetedPointerEvent,
    TargetedWheelEvent,
} from "preact";
import { cx } from "./utils.ts";
import { ColorLabel, TextLabel } from "./label.tsx";
import { useRef, useState } from "preact/hooks";
import { Anchored } from "./front-layer.tsx";
import { ShaderFill } from "./shader-fill.tsx";
import "./control.css";

export const Label: ComponentType = ({ children }) => {
    return <div class={cx("nahara-ui-label")}>{children}</div>;
};

/**
 * Simple interactive button
 *
 * This component should only be used for one interaction only, which is clicking/tapping. For other interactions, such
 * as dragging or double clicking, consider use different control.
 */
export const Button: ComponentType<{
    type?: ButtonHTMLAttributes["type"];
    id?: ButtonHTMLAttributes["id"];
    name?: ButtonHTMLAttributes["name"];
    style: "generic" | "bordered";
    state?: "normal" | "activated" | "disabled";
    btnRef?: Ref<HTMLButtonElement>;
    onClick?: ButtonHTMLAttributes["onClick"];
}> = ({
    type = "button",
    id,
    name,
    style,
    state = "normal",
    btnRef,
    onClick,
    children,
}) => {
    return (
        <button
            type={type}
            id={id}
            name={name}
            class={cx("nahara-ui-button", `style-${style}`, { activated: state == "activated" })}
            disabled={state == "disabled"}
            onClick={onClick}
            ref={btnRef}
        >
            {children}
        </button>
    );
};

export const TextInput: ComponentType<{
    id?: InputHTMLAttributes["id"];
    name?: InputHTMLAttributes["name"];
    value?: InputHTMLAttributes["value"];
    disabled?: InputHTMLAttributes["disabled"];
    onInput?: InputHTMLAttributes["onInput"];
    onFinished?: () => void;
}> = ({
    id,
    name,
    value,
    disabled,
    onInput,
    onFinished = () => {},
}) => {
    return (
        <input
            type="text"
            name={name}
            id={id}
            class={cx("nahara-ui-text-input")}
            value={value}
            disabled={disabled}
            onInput={onInput}
            onBlur={() => onFinished()}
        />
    );
};

export const Slider: ComponentType<{
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    countsPerPage?: number;
    label?: (value: number) => ComponentChildren;
    onInput?: (value: number) => void;
    onFinished?: () => void;
}> = ({
    value = 0,
    min,
    max,
    step,
    countsPerPage = 1,
    label = (value) => <TextLabel>{value.toFixed(2)}</TextLabel>,
    onInput = () => {},
    onFinished = () => {},
}) => {
    const [finishTask, setFinishTask] = useState<ReturnType<typeof setTimeout> | null>(null);
    const progress = min != null && max != null ? Math.min(Math.max((value - min) / (max - min), 0), 1) : null;

    function processValue(value: number): number {
        if (min != null && value < min) value = min;
        if (max != null && value > max) value = max;
        if (step != null) value = Math.round(value / step) * step;
        return value;
    }

    function onPointerDown(e: TargetedPointerEvent<HTMLDivElement>) {
        const initialX = e.clientX;
        const target = e.currentTarget;
        const { width } = target.getBoundingClientRect();

        function onMove(e: PointerEvent) {
            const x = e.clientX;
            const dx = x - initialX;
            const dp = dx / width;
            const delta = (min != null && max != null ? (max - min) : countsPerPage) * dp;
            e.preventDefault();
            onInput(processValue(value + delta));
        }

        function onUp() {
            onFinished();
            target.removeEventListener("pointermove", onMove);
            target.removeEventListener("pointerup", onUp);
        }

        e.preventDefault();
        target.setPointerCapture(e.pointerId);
        target.addEventListener("pointermove", onMove);
        target.addEventListener("pointerup", onUp);
    }

    function onWheel(e: TargetedWheelEvent<HTMLDivElement>) {
        const target = e.currentTarget;
        let dp: number;

        switch (e.deltaMode) {
            case WheelEvent.DOM_DELTA_PIXEL: {
                const { width } = target.getBoundingClientRect();
                const dx = e.deltaX != 0 ? -e.deltaX : -e.deltaY;
                dp = dx / width;
                break;
            }

            case WheelEvent.DOM_DELTA_PAGE: {
                dp = e.deltaY;
                break;
            }

            default: {
                dp = e.deltaY / 8;
                break;
            }
        }

        const delta = (min != null && max != null ? (max - min) : countsPerPage) * dp;
        e.preventDefault();
        onInput(processValue(value + delta));

        if (finishTask != null) {
            clearTimeout(finishTask);
        }

        const task = setTimeout(() => {
            setFinishTask((t) => t != task ? t : null);
            onFinished();
        }, 125);

        setFinishTask(task);
    }

    function onKeyDown(e: KeyboardEvent) {
        let delta: number;

        switch (e.code) {
            case "ArrowLeft":
            case "ArrowDown": {
                delta = -(step ?? (countsPerPage / 10));
                break;
            }

            case "ArrowRight":
            case "ArrowUp": {
                delta = step ?? (countsPerPage / 10);
                break;
            }

            default: {
                return;
            }
        }

        e.preventDefault();
        onInput(processValue(value + delta));
        onFinished();
    }

    function onPointerOut() {
        if (finishTask != null) {
            clearTimeout(finishTask);
            setFinishTask(null);
            onFinished();
        }
    }

    return (
        <div
            class={cx("nahara-ui-slider")}
            role="slider"
            tabindex={0}
            onPointerDown={onPointerDown}
            onPointerOut={onPointerOut}
            onWheel={onWheel}
            onKeyDown={onKeyDown}
        >
            {progress == null ? null : (
                <div
                    class={cx("progress", { "show-handle": progress != 0 && progress != 1 })}
                    style={{ "--progress": progress }}
                />
            )}
            <div class={cx("label")}>
                {label(value)}
            </div>
        </div>
    );
};

export const ColorInput: ComponentType<{
    value?: readonly [r: number, g: number, b: number];
    disabled?: boolean;
    onInput?: (color: [r: number, g: number, b: number]) => void;
    onFinished?: () => void;
}> = ({
    value = [0, 0, 0],
    disabled = false,
    onInput = () => {},
    onFinished = () => {},
}) => {
    const [showPicker, setShowPicker] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);

    const hexCode = value
        .map((channel) => Math.round(Math.min(Math.max(channel * 255, 0), 255)))
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("");

    return (
        <>
            <Button
                style="bordered"
                state={showPicker ? "activated" : disabled ? "disabled" : "normal"}
                btnRef={btnRef}
                onClick={() => setShowPicker((x) => !x)}
            >
                <ColorLabel color={"#" + hexCode} />
                <TextLabel>#{hexCode}</TextLabel>
            </Button>
            {!showPicker ? null : (
                <Anchored target={btnRef} pointerEvents>
                    <div class={cx("nahara-ui-color-input")}>
                        <ColorPicker
                            value={value}
                            onInput={onInput}
                            onFinished={onFinished}
                        />
                    </div>
                </Anchored>
            )}
        </>
    );
};

export const ColorPicker: ComponentType<{
    value: readonly [r: number, g: number, b: number];
    onInput: (color: [r: number, g: number, b: number]) => void;
    onFinished?: () => void;
}> = ({
    value,
    onInput,
    onFinished = () => {},
}) => {
    return (
        <div class={cx("nahara-ui-color-picker")}>
            <div class={cx("saturation-lightness")}>
                <ShaderFill
                    wgsl={`
                        @group(0) @binding(0) var<uniform> alpha: f32;

                        @fragment
                        fn fragmentMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
                            return vec4<f32>(uv, 0.5, 1.0) * alpha;
                        }
                    `}
                    uniformSize={4}
                    onUniform={(uniform) => new Float32Array(uniform)[0] = 1}
                />
            </div>
        </div>
    );
};

export const PropertiesTable: ComponentType = ({
    children,
}) => {
    return (
        <table class={cx("nahara-ui-properties-table")}>
            <colgroup class={cx("name")}></colgroup>
            <colgroup class={cx("value")}></colgroup>
            {children}
        </table>
    );
};

export const PropertyGroup: ComponentType<{ label: ComponentChildren }> = ({
    label,
    children,
}) => {
    return (
        <tbody class={cx("nahara-ui-property-group")}>
            <tr class={cx("header-track")}>
                <th colspan={2}>
                    <div class={cx("content")}>
                        {label}
                    </div>
                </th>
            </tr>
            {children}
        </tbody>
    );
};

export const Property: ComponentType<{
    label: ComponentChildren;
    level: number;
}> = ({
    label,
    level,
    children,
}) => {
    return (
        <tr class={cx("nahara-ui-property")} style={{ "--level": level }}>
            <th>
                <div class={cx("content")}>
                    {label}
                </div>
            </th>
            <td>
                <div class={cx("content")}>
                    {children}
                </div>
            </td>
        </tr>
    );
};
