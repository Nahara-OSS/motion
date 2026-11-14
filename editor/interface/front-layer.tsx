import {
    type ComponentChildren,
    type ComponentType,
    type Context,
    createContext,
    createPortal,
    type RefObject,
} from "preact";
import { cx } from "./utils.ts";
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import "./front-layer.css";

const FrontLayerContext: Context<FrontLayerInfo> = createContext<FrontLayerInfo>({
    element: () => {
        throw new Error("<FrontLayerProvider /> must be added first!");
    },
    handleDismiss: () => {
        throw new Error("<FrontLayerProvider /> must be added first!");
    },
});

interface FrontLayerInfo {
    element(): HTMLDivElement;
    handleDismiss(callback: () => void): () => void;
}

export const FrontLayerProvider: ComponentType = ({ children }) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [dismissCounter, setDismissCounter] = useState(0);

    const frontLayer: FrontLayerInfo = {
        element: () => {
            const div = divRef.current;
            if (div == null) throw new Error("Unable to get front layer element");
            return div;
        },

        handleDismiss: (callback) => {
            const div = divRef.current;
            if (div == null) throw new Error("Unable to get front layer element");

            function onPointerDown(e: PointerEvent) {
                if (e.target != e.currentTarget) return;
                callback();
            }

            setDismissCounter((x) => x + 1);
            div.addEventListener("pointerdown", onPointerDown);

            return () => {
                setDismissCounter((x) => x - 1);
                div.removeEventListener("pointerup", onPointerDown);
            };
        },
    };

    return (
        <>
            <FrontLayerContext.Provider value={frontLayer}>{children}</FrontLayerContext.Provider>
            <div class={cx("nahara-ui-front-layer", { "handle-dismiss": dismissCounter > 0 })} ref={divRef} />
        </>
    );
};

export const FrontLayerPortal: ComponentType = ({ children }) => {
    const frontLayer = useContext(FrontLayerContext);
    return createPortal(children, frontLayer.element());
};

export const DismissHandler: ComponentType<{ enable: boolean; onDismiss: () => void }> = ({ enable, onDismiss }) => {
    const frontLayer = useContext(FrontLayerContext);
    useEffect(() => enable ? frontLayer.handleDismiss(onDismiss) : undefined, [enable, onDismiss]);
    return null;
};

export const Anchored: ComponentType<{
    pointerEvents?: boolean;
    target: RefObject<{ getBoundingClientRect(): DOMRect } | null>;
    positions?: readonly { readonly target: Origin; readonly box: Origin }[];
}> = ({
    pointerEvents = false,
    target: targetRef,
    positions = [
        { target: Origin.TopRight, box: Origin.TopLeft },
        { target: Origin.TopLeft, box: Origin.TopRight },
        { target: Origin.BottomCenter, box: Origin.TopCenter },
        { target: Origin.TopCenter, box: Origin.BottomCenter },
        { target: Origin.BottomLeft, box: Origin.TopRight },
        { target: Origin.BottomRight, box: Origin.TopLeft },
        { target: Origin.TopLeft, box: Origin.BottomRight },
        { target: Origin.TopRight, box: Origin.BottomLeft },
    ],
    children,
}) => {
    const [position, setPosition] = useState<readonly [x: number, y: number] | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const frontLayer = useContext(FrontLayerContext);

    useLayoutEffect(() => {
        if (boxRef.current == null || targetRef.current == null) {
            setPosition(null);
            return;
        }

        const target = targetRef.current.getBoundingClientRect();
        const { width, height } = boxRef.current.getBoundingClientRect();
        const bounds = frontLayer.element().getBoundingClientRect();
        let selectedPosition = positions[0];

        for (const position of positions) {
            const { target: targetOrigin, box: boxOrigin } = position;

            if (testBoxPlacement(bounds, target, width, height, targetOrigin, boxOrigin)) {
                selectedPosition = position;
                break;
            }
        }

        const { target: targetOrigin, box: boxOrigin } = selectedPosition;
        const { left, right, top, bottom } = target;
        const [targetX, targetY] = originToPosition(targetOrigin, left, right, top, bottom);
        const [offsetX, offsetY] = originToPosition(boxOrigin, 0, width, 0, height);
        setPosition([targetX - offsetX, targetY - offsetY]);
    }, [targetRef]);

    return createPortal(
        <div
            class={cx("nahara-ui-anchored", { "pointer-events": pointerEvents })}
            style={{
                left: position != null ? `${position[0]}px` : null,
                top: position != null ? `${position[1]}px` : null,
            }}
            ref={boxRef}
        >
            <div class={cx("content")}>
                {children}
            </div>
        </div>,
        frontLayer.element(),
    );
};

export const Tooltip: ComponentType<{
    tooltip: ComponentChildren;
    positions?: readonly { readonly target: Origin; readonly box: Origin }[];
    mode?: "hover" | "show" | "hide";
}> = ({
    tooltip,
    positions,
    mode = "hover",
    children,
}) => {
    const [hovering, setHovering] = useState(false);
    const targetRef = useRef<HTMLDivElement>(null);
    const show = mode == "hover" ? hovering : mode == "show";

    return (
        <>
            <div
                class={cx("nahara-ui-tooltip", "target")}
                onPointerEnter={useCallback(() => setHovering(true), [])}
                onPointerLeave={useCallback(() => setHovering(false), [])}
                ref={targetRef}
            >
                {children}
            </div>
            {!show ? null : (
                <Anchored target={targetRef} positions={positions}>
                    <div class={cx("nahara-ui-tooltip", "content")}>
                        {tooltip}
                    </div>
                </Anchored>
            )}
        </>
    );
};

export type Origin = readonly [x: number, y: number];
export const Origin = {
    TopLeft: [0, 0] as Origin,
    TopCenter: [0.5, 0] as Origin,
    TopRight: [1, 0] as Origin,
    CenterLeft: [0, 0.5] as Origin,
    CenterCenter: [0.5, 0.5] as Origin,
    CenterRight: [1, 0.5] as Origin,
    BottomLeft: [0, 1] as Origin,
    BottomCenter: [0.5, 1] as Origin,
    BottomRight: [1, 1] as Origin,
};

export function testBoxPlacement(
    bounds: DOMRectReadOnly,
    target: DOMRectReadOnly,
    width: number,
    height: number,
    targetOrigin: Origin,
    boxOrigin: Origin,
): boolean {
    const [targetX, targetY] = originToPosition(targetOrigin, target.left, target.right, target.top, target.bottom);
    const [offsetX, offsetY] = originToPosition(boxOrigin, 0, width, 0, height);
    const left = targetX - offsetX;
    const right = left + width;
    const top = targetY - offsetY;
    const bottom = top + height;
    return left >= bounds.left && right <= bounds.right && top >= bounds.top && bottom <= bounds.bottom;
}

export function originToPosition(
    origin: Origin,
    left: number,
    right: number,
    top: number,
    bottom: number,
): readonly [number, number] {
    const targetX = left * (1 - origin[0]) + right * origin[0];
    const targetY = top * (1 - origin[1]) + bottom * origin[1];
    return [targetX, targetY];
}
