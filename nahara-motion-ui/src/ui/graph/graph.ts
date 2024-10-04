import type { BezierEasing, Color, IAnimatable, Keyframe, Vec2 } from "@nahara/motion";
import { snapping } from "../../snapping";
import type { DropdownEntry } from "../menu/FancyMenu";

export namespace graph {
    /**
     * Store the current state of the graph canvas thing, such as currently clicked keyframe/handle.
     */
    export interface State {
        /**
         * A list of all properties that are belongs to currently selected object, or an empty list if there are no
         * object selected. This will be used to render ghost graph (mainly for referencing).
         */
        allProperties: IAnimatable<any>[];

        /**
         * The current property that is being edited.
         */
        property?: IAnimatable<any>;

        /**
         * A list of selected keyframes. If there are no keyframe selected, the graph will allows you to edit each
         * individual keyframe by dragging its handles. If there is at least 1 keyframe selected, the graph will enters
         * bulk edit mode, where you can edit all selected keyframes at once (like moving up or down, left or right),
         * but stuffs like bezier curve handles will not be available during bulk edit mode.
         */
        selectedKeyframes: Keyframe<any>[];

        /**
         * The keyframe whose handle is being dragged.
         */
        adjustingKeyframe?: Keyframe<any>;

        /**
         * The handle of the adjusting keyframe. Ignored if adjusting keyframe is not present.
         * - `self`: Dragging the keyframe itself. Controls the timing of the keyframe.
         * - `cp1` and `cp2` (Bezier curve only): The control point handles of the keyframe's easing function.
         */
        adjustHandleType: "self" | "cp1" | "cp2";

        eventDownX?: number;
        eventDownY?: number;
        keyframeInitialTime?: number;
        keyframeInitialValue?: number;
        keyframeInitialCp?: Vec2;
        keyframeCurveAreaWidth?: number;
        keyframeCurveAreaHeight?: number;

        /**
         * Vertical zoom (a.k.a value axis zoom) in units/px. If the zoom is `auto`, it will fits the values of all
         * keyframes that are visible in the graph.
         */
        verticalZoom: number | "auto";
        verticalScroll: number;
        horizontalZoom: number;
        horizontalScroll: number;
    }

    export function positionYOf(value: any, height: number, verticalScroll: number, verticalZoom: number): number {
        const midpoint = height / 2;
        if (typeof value == "number") return midpoint - (value - verticalScroll) / verticalZoom;
        return midpoint;
    }

    export function calculateVerticalZoom(state: State, width: number, height: number): number {
        if (state.verticalZoom == "auto") {
            if (!state.property) return 1;

            const startTime = state.horizontalScroll;
            const endTime = state.horizontalScroll + width * 1000 / state.horizontalZoom;
            const start = state.property.get(startTime);
            const end = state.property.get(endTime);
            if (typeof start != "number" || typeof end != "number") return 1;
            let lastValue = start;

            let max = Math.max(start, end);
            let min = Math.min(start, end);
            const visibleKeyframes: Iterable<Keyframe<any>> = state.property; // TODO

            for (const keyframe of visibleKeyframes) {
                if (keyframe.time < startTime || keyframe.time >= endTime) continue;
                min = Math.min(min, keyframe.value as number);
                max = Math.max(max, keyframe.value as number);

                if (typeof keyframe.easing != "string" && keyframe.easing.type == "bezier") {
                    const { startControlPoint, endControlPoint } = keyframe.easing;
                    const delta = keyframe.value - lastValue;
                    min = Math.min(min, lastValue + startControlPoint.y * delta, keyframe.value + endControlPoint.y * delta);
                    max = Math.max(max, lastValue + startControlPoint.y * delta, keyframe.value + endControlPoint.y * delta);
                }

                lastValue = keyframe.value;
            }

            const midpoint = (min + max) / 2;
            const rawUnitsPerPx = Math.max((max - min) / height, 0.01);
            state.verticalScroll = midpoint;
            return rawUnitsPerPx * (1 + 20 / height);
        }

        return state.verticalZoom;
    }

    export function forEachKeyframeInGraph(
        state: State,
        width: number,
        height: number,
        callback: (x: number, y: number, kf: Keyframe<any>) => void | "break"
    ) {
        if (state.property) {
            const startTime = state.horizontalScroll;
            const endTime = state.horizontalScroll + width * 1000 / state.horizontalZoom;
            const verticalZoom = calculateVerticalZoom(state, width, height);

            let emitting = false;
            let lastKeyframe: Keyframe<any> | undefined = undefined;

            for (const keyframe of state.property) {
                if (!emitting) {
                    if (keyframe.time < startTime) {
                        lastKeyframe = keyframe;
                        continue;
                    } else {
                        emitting = true;

                        if (lastKeyframe) {
                            const lastX = (lastKeyframe!.time - state.horizontalScroll) * state.horizontalZoom / 1000;
                            const lastY = positionYOf(lastKeyframe!.value, height, state.verticalScroll, verticalZoom);
                            if (callback(lastX, lastY, lastKeyframe!) == "break") break;
                        }
                    }
                }

                lastKeyframe = keyframe;
                const x = (keyframe.time - state.horizontalScroll) * state.horizontalZoom / 1000;
                const y = positionYOf(keyframe.value, height, state.verticalScroll, verticalZoom);
                if (callback(x, y, keyframe) == "break") break;

                if (keyframe.time >= endTime) break;
            }
        }
    }

    function cubicBezierLine(ctx: CanvasRenderingContext2D, cp1: Vec2, cp2: Vec2, from: Vec2, to: Vec2) {
        const width = to.x - from.x;
        const height = to.y - from.y;
        ctx.bezierCurveTo(
            from.x + cp1.x * width, from.y + cp1.y * height,
            to.x + cp2.x * width, to.y + cp2.y * height,
            to.x, to.y
        );
    }

    const EASE_IN_CONTROL_POINTS: [Vec2, Vec2] = [{ x: 0.42, y: 0 }, { x: 0, y: 0 }];
    const EASE_OUT_CONTROL_POINTS: [Vec2, Vec2] = [{ x: 0, y: 0 }, { x: -0.42, y: 0 }];
    const EASE_IN_OUT_CONTROL_POINTS: [Vec2, Vec2] = [{ x: 0.42, y: 0 }, { x: -0.42, y: 0 }];

    export function renderGraph(
        state: State,
        ctx: CanvasRenderingContext2D,
        width: number, height: number
    ) {
        if (state.property) {
            const verticalZoom = calculateVerticalZoom(state, width, height);
            const startTime = state.horizontalScroll;

            let firstPoint = false;
            let lastX = -state.horizontalScroll * state.horizontalZoom / 1000;
            let lastY = positionYOf(state.property.get(startTime), height, state.verticalScroll, verticalZoom);

            ctx.lineWidth = 1;
            ctx.strokeStyle = "#000";
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);

            // Graph
            forEachKeyframeInGraph(state, width, height, (x, y, keyframe) => {
                if (!firstPoint) {
                    firstPoint = true;
                    if (x == 0) ctx.moveTo(x, y);
                    else {
                        ctx.lineTo(x, lastY);
                        ctx.lineTo(x, y);
                    }
                } else if (typeof keyframe.easing == "string") {
                    switch (keyframe.easing) {
                        case "linear": ctx.lineTo(x, y); break;
                        case "hold": ctx.lineTo(x, lastY); ctx.lineTo(x, y); break;
                        case "ease-in": cubicBezierLine(ctx, ...EASE_IN_CONTROL_POINTS, { x: lastX, y: lastY }, { x, y }); break;
                        case "ease-out": cubicBezierLine(ctx, ...EASE_OUT_CONTROL_POINTS, { x: lastX, y: lastY }, { x, y }); break;
                        case "ease-in-out": cubicBezierLine(ctx, ...EASE_IN_OUT_CONTROL_POINTS, { x: lastX, y: lastY }, { x, y }); break;
                        default: ctx.lineTo(x, y); break;
                    }
                } else if (keyframe.easing.type == "bezier") {
                    cubicBezierLine(
                        ctx,
                        keyframe.easing.startControlPoint,
                        keyframe.easing.endControlPoint,
                        { x: lastX, y: lastY },
                        { x, y }
                    );
                }

                lastX = x;
                lastY = y;
            });

            ctx.lineTo(width, lastY);
            ctx.stroke();
            ctx.closePath();

            // Handles
            lastX = -state.horizontalScroll * state.horizontalZoom / 1000;
            lastY = positionYOf(state.property.defaultValue, height, state.verticalScroll, verticalZoom);
            let lastKeyframe: Keyframe<any> = { time: 0, easing: "hold", value: state.property.defaultValue, uid: "0" };

            forEachKeyframeInGraph(state, width, height, (x, y, keyframe) => {
                renderKeyframeHandlesAt(x, y, lastX, lastY, keyframe, lastKeyframe, state.property!, state.adjustingKeyframe == keyframe, ctx);
                lastX = x;
                lastY = y;
                lastKeyframe = keyframe;
            });
        }
    }

    function renderKeyframeHandlesAt(
        x: number, y: number, lastX: number, lastY: number,
        keyframe: Keyframe<any>, lastKeyframe: Keyframe<any>,
        property: IAnimatable<any>, selected: boolean,
        ctx: CanvasRenderingContext2D
    ) {
        if (typeof keyframe.value == "number") {
            ctx.strokeStyle = selected ? "#1d1d1d" : "#7f7f7f";
            ctx.fillStyle = selected ? "#1d1d1d1f" : "#ffffffaf";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if ("model" in keyframe.value) {
            // Color
            const color = keyframe.value as Color;

            if ((x - lastX) > 22) {
                const gradient = ctx.createLinearGradient(lastX + 11, y, x - 11, y);

                for (let i = 0; i <= 1; i += 0.1) {
                    const col: Color = property.get(lastKeyframe.time + (keyframe.time - lastKeyframe.time) * i);
                    gradient.addColorStop(i, `rgba(${col.r}, ${col.g}, ${col.b}, ${(col.a ?? 255) / 255})`);
                }

                ctx.fillStyle = gradient;
                ctx.fillRect(lastX + 11, y - 10, x - lastX - 22, 20);
            }

            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(color.a ?? 255) / 255})`;
            ctx.fillRect(x - 10, y - 10, 20, 20);
            
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#fff"; ctx.strokeRect(x - 10, y - 10, 20, 20);
            ctx.strokeStyle = "#000"; ctx.strokeRect(x - 11, y - 11, 22, 22);
        }

        if (typeof keyframe.easing != "string" && keyframe.easing.type == "bezier") {
            const { startControlPoint, endControlPoint } = keyframe.easing;
            const curveWidth = x - lastX;
            const curveHeight = (typeof keyframe.value != "number" && "model" in keyframe.value) ? 100 : y - lastY;
            const nodeRadi = Math.min(curveWidth / 5, 5);
            if (curveHeight == 0) return;

            const cp1Dist = Math.sqrt((startControlPoint.x * curveWidth)**2 + (startControlPoint.y * curveHeight)**2);
            const cp2Dist = Math.sqrt((endControlPoint.x * curveWidth)**2 + (endControlPoint.y * curveHeight)**2);

            ctx.strokeStyle = "#d1d1d1";
            ctx.lineWidth = 1;

            ctx.beginPath();
            if (typeof keyframe.value != "number" && "model" in keyframe.value) ctx.moveTo(lastX, lastY);
            else ctx.moveTo(lastX + startControlPoint.x * curveWidth * nodeRadi / cp1Dist, lastY + startControlPoint.y * curveHeight * nodeRadi / cp1Dist);
            ctx.lineTo(lastX + startControlPoint.x * curveWidth, lastY + startControlPoint.y * curveHeight);
            ctx.stroke();
            ctx.closePath();

            ctx.beginPath();
            ctx.moveTo(x + endControlPoint.x * curveWidth * nodeRadi / cp2Dist, y + endControlPoint.y * curveHeight * nodeRadi / cp2Dist);
            ctx.lineTo(x + endControlPoint.x * curveWidth, y + endControlPoint.y * curveHeight);
            ctx.stroke();
            ctx.closePath();

            ctx.fillStyle = "#ffffff7f";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(lastX + startControlPoint.x * curveWidth, lastY + startControlPoint.y * curveHeight, nodeRadi, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x + endControlPoint.x * curveWidth, y + endControlPoint.y * curveHeight, nodeRadi, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    export function handleContextMenu(state: State, mx: number, my: number, vw: number, vh: number): {
        property?: IAnimatable<any>,
        keyframe?: Keyframe<any>
    } {
        if (state.property) {
            let clickedKeyframe: Keyframe<any> | undefined = undefined;

            forEachKeyframeInGraph(state, vw, vh, (x, y, keyframe) => {
                const scalarHandle = typeof keyframe.value == "number" && (mx - x) ** 2 + (my - y) ** 2 <= 5 ** 2;
                const colorHandle = typeof keyframe.value == "object" && "model" in keyframe.value
                    && mx >= x - 10 && my >= y - 10 && mx < x + 10 && my < y + 10;

                if (scalarHandle || colorHandle) {
                    clickedKeyframe = keyframe;
                    return "break";
                }
            });

            if (clickedKeyframe) return { property: state.property, keyframe: clickedKeyframe };
            return { property: state.property };
        }

        return {};
    }

    export function handleMouseDown(state: State, mx: number, my: number, vw: number, vh: number) {
        state.eventDownX = mx;
        state.eventDownY = my;

        if (state.property) {
            const verticalZoom = calculateVerticalZoom(state, vw, vh);
            let clickedKeyframe: Keyframe<any> | undefined = undefined;
            let lastX = -state.horizontalScroll * state.horizontalZoom / 1000;
            let lastY = positionYOf(state.property.defaultValue, vh, state.verticalScroll, verticalZoom);

            forEachKeyframeInGraph(state, vw, vh, (x, y, keyframe) => {
                if (typeof keyframe.easing != "string" && keyframe.easing.type == "bezier") {
                    const curveWidth = x - lastX;
                    const curveHeight = (typeof keyframe.value != "number" && "model" in keyframe.value) ? 100 : y - lastY;
                    const { startControlPoint, endControlPoint } = keyframe.easing;
                    const cp1Xy = [lastX + startControlPoint.x * curveWidth, lastY + startControlPoint.y * curveHeight];
                    const cp2Xy = [x + endControlPoint.x * curveWidth, y + endControlPoint.y * curveHeight];
                    const nodeRadi = Math.min(curveWidth / 5, 5);

                    if (curveHeight != 0) {
                        // TODO deduplicate code
                        state.keyframeCurveAreaWidth = curveWidth;
                        state.keyframeCurveAreaHeight = curveHeight;

                        if ((mx - cp1Xy[0]) ** 2 + (my - cp1Xy[1]) ** 2 <= nodeRadi ** 2) {
                            clickedKeyframe = keyframe;
                            state.adjustingKeyframe = keyframe;
                            state.adjustHandleType = "cp1";
                            state.keyframeInitialTime = keyframe.time;
                            state.keyframeInitialCp = { ...keyframe.easing.startControlPoint };
                            return "break";
                        }

                        if ((mx - cp2Xy[0]) ** 2 + (my - cp2Xy[1]) ** 2 <= nodeRadi ** 2) {
                            clickedKeyframe = keyframe;
                            state.adjustingKeyframe = keyframe;
                            state.adjustHandleType = "cp2";
                            state.keyframeInitialTime = keyframe.time;
                            state.keyframeInitialCp = { ...keyframe.easing.endControlPoint };
                            return "break";
                        }
                    }
                }
                
                const draggingScalarHandle = typeof keyframe.value == "number" && (mx - x) ** 2 + (my - y) ** 2 <= 5 ** 2;
                const draggingColorHandle = typeof keyframe.value == "object" && "model" in keyframe.value
                    && mx >= x - 10 && my >= y - 10 && mx < x + 10 && my < y + 10;

                if (draggingScalarHandle || draggingColorHandle) {
                    clickedKeyframe = keyframe;
                    state.adjustingKeyframe = keyframe;
                    state.adjustHandleType = "self";
                    state.keyframeInitialTime = keyframe.time;
                    state.keyframeInitialValue = keyframe.value;
                    return "break";
                }

                lastX = x;
                lastY = y;
            });

            if (!clickedKeyframe) {
                const time = mx * 1000 / state.horizontalZoom + state.horizontalScroll;
                const yp = 0.5 - my / vh;
                const value = typeof state.property.defaultValue == "number"
                    ? state.verticalScroll + yp * (verticalZoom * vh)
                    : state.property.get(time);
                state.adjustingKeyframe = state.property.set(time, value);
                state.adjustHandleType = "self";
                state.keyframeInitialTime = time;
                state.keyframeInitialValue = value;
            }
        }
    }

    export function handleMouseMove(state: State, mx: number, my: number, vw: number, vh: number) {
        const dx = mx - state.eventDownX!, dy = my - state.eventDownY!;

        if (state.property && state.adjustingKeyframe) {
            if (state.adjustHandleType == "self") {
                let newTime = snapping.snapTimeline(state.keyframeInitialTime! + dx * 1000 / state.horizontalZoom);
                newTime = Math.max(newTime, 0);

                if (typeof state.adjustingKeyframe.value == "number") {
                    state.adjustingKeyframe = state.property.modify(state.adjustingKeyframe, {
                        time: newTime,
                        value: state.keyframeInitialValue! - dy * calculateVerticalZoom(state, vw, vh)
                    }) ?? undefined;
                } else {
                    state.adjustingKeyframe = state.property.modify(state.adjustingKeyframe, { time: newTime }) ?? undefined;
                }
            } else if (state.adjustHandleType == "cp1") {
                state.adjustingKeyframe = state.property.modify(state.adjustingKeyframe, {
                    easing: {
                        type: "bezier",
                        startControlPoint: {
                            x: Math.min(Math.max(state.keyframeInitialCp!.x + dx / state.keyframeCurveAreaWidth!, 0), 1),
                            y: state.keyframeInitialCp!.y + dy / state.keyframeCurveAreaHeight!
                        },
                        endControlPoint: (state.adjustingKeyframe.easing as BezierEasing).endControlPoint,
                    }
                }) ?? undefined;
            } else if (state.adjustHandleType == "cp2") {
                state.adjustingKeyframe = state.property.modify(state.adjustingKeyframe, {
                    easing: {
                        type: "bezier",
                        startControlPoint: (state.adjustingKeyframe.easing as BezierEasing).startControlPoint,
                        endControlPoint: {
                            x: Math.min(Math.max(state.keyframeInitialCp!.x + dx / state.keyframeCurveAreaWidth!, -1), 0),
                            y: state.keyframeInitialCp!.y + dy / state.keyframeCurveAreaHeight!
                        },
                    }
                }) ?? undefined;
            }
        }
    }

    export function handleMouseUp(state: State, mx: number, my: number, vw: number, vh: number) {
        state.adjustingKeyframe = undefined;
    }
}