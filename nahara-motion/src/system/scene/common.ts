import { Anchor, calculateAnchorPos } from "../../anchor.js";
import { RenderContext } from "../../render/context.js";
import { IAnimatable } from "../../scene/animation.js";
import { ISceneObjectWithViewportEditSupport, ViewportEditMouseEvent, ViewportEditorInfo } from "../../scene/editor.js";
import { ISceneObjectWithPositionalData, ISceneObjectWithSizeData, ISceneObjectWithRotationData } from "../../scene/object.js";
import { IObjectProperty } from "../../scene/property.js";
import { Vec2 } from "../../types.js";

interface ViewportEditorData {
    initialLocal: Vec2,
    initialParentLocal: Vec2,
    initialPosition: Vec2,
    initialSize: Vec2,
}

export abstract class AbstractBoxLikeSceneObject implements ISceneObjectWithPositionalData, ISceneObjectWithSizeData, ISceneObjectWithRotationData, ISceneObjectWithViewportEditSupport<ViewportEditorData> {
    isViewportEditable: true = true;
    isPositional: true = true;
    isSizable: true = true;
    isRotatable: true = true;

    abstract anchor: Anchor;
    abstract origin: Anchor;
    abstract x: IAnimatable<number>;
    abstract y: IAnimatable<number>;
    abstract width: IAnimatable<number>;
    abstract height: IAnimatable<number>;
    abstract rotation: IAnimatable<number>;
    abstract properties: IObjectProperty<any>[];

    abstract render(context: RenderContext): void;

    getViewportEditorInfo(time: number, parentSize: Vec2): ViewportEditorInfo {
        const offsetX = this.x.get(time);
        const offsetY = this.y.get(time);
        const width = this.width.get(time);
        const height = this.height.get(time);
        const rotation = this.rotation.get(time);
        const posInParent = calculateAnchorPos(parentSize, this.anchor);
        const posInSelf = calculateAnchorPos({ x: width, y: height }, this.origin);

        return {
            parentToThis: new DOMMatrix()
                .translate(posInParent.x, posInParent.y)
                .translate(offsetX, offsetY)
                .rotate(rotation)
                .translate(-posInSelf.x, -posInSelf.y),
            clickableSize: { x: width, y: height },
            handles: [
                {
                    uid: "resize-xywh",
                    hint: "resize-top-left",
                    offsetX: 0,
                    offsetY: 0
                },
                {
                    uid: "resize-wh",
                    hint: "resize-bottom-right",
                    offsetX: width,
                    offsetY: height
                }
            ],
        };
    }

    renderBlueprint(context: RenderContext, objectColor: string, viewportScale: number): void {
        const { parentToThis, clickableSize } = this.getViewportEditorInfo(context.time, context.containerSize);
        objectColor = objectColor.trim();
        objectColor = objectColor.match(/^#[0-9A-Fa-f]{8}$/) ? objectColor.substring(0, 7) : objectColor;
        objectColor = objectColor.match(/^#[0-9A-Fa-f]{5}$/) ? objectColor.substring(0, 4) : objectColor;

        function strokeWithOutline() {
            context.canvas.lineWidth = 4 / viewportScale;
            context.canvas.strokeStyle = "#0007";
            context.canvas.stroke();
            context.canvas.lineWidth = 2 / viewportScale;
            context.canvas.strokeStyle = objectColor;
            context.canvas.stroke();
        }

        function marketAt({ x, y }: Vec2) {
            context.canvas.beginPath();
            context.canvas.moveTo(x - 5 / viewportScale, y - 5 / viewportScale);
            context.canvas.lineTo(x + 5 / viewportScale, y + 5 / viewportScale);
            context.canvas.moveTo(x + 5 / viewportScale, y - 5 / viewportScale);
            context.canvas.lineTo(x - 5 / viewportScale, y + 5 / viewportScale);
            strokeWithOutline();
        }

        context.canvas.lineWidth = 4 / viewportScale;
        context.canvas.strokeStyle = "#0007";
        context.canvas.strokeRect(0, 0, context.containerSize.x, context.containerSize.y);
        context.canvas.lineWidth = 2 / viewportScale;
        context.canvas.strokeStyle = objectColor + (objectColor.length == 4 ? "7" : "7f");
        context.canvas.strokeRect(0, 0, context.containerSize.x, context.containerSize.y);

        const anchorPos = calculateAnchorPos(context.containerSize, this.anchor);
        marketAt(anchorPos);

        const parent = context.canvas.getTransform();
        context.canvas.setTransform(parent.multiply(parentToThis));
        context.canvas.lineWidth = 4 / viewportScale;
        context.canvas.strokeStyle = "#0007";
        context.canvas.strokeRect(0, 0, clickableSize.x, clickableSize.y);
        context.canvas.lineWidth = 2 / viewportScale;
        context.canvas.strokeStyle = objectColor;
        context.canvas.strokeRect(0, 0, clickableSize.x, clickableSize.y);

        const originPos = calculateAnchorPos(clickableSize, this.origin);
        marketAt(originPos);
        context.canvas.setTransform(parent);

        const originPosInParent = parentToThis.transformPoint({ x: originPos.x, y: originPos.y, z: 0, w: 1 });
        context.canvas.beginPath();
        context.canvas.moveTo(anchorPos.x, anchorPos.y);
        context.canvas.lineTo(originPosInParent.x, originPosInParent.y);
        strokeWithOutline();
    }

    viewportEditMouseDown(event: ViewportEditMouseEvent): ViewportEditorData {
        return {
            initialLocal: { x: event.localObjectX, y: event.localObjectY },
            initialParentLocal: { x: event.parentObjectLocalX, y: event.parentObjectLocalY },
            initialPosition: { x: this.x.get(event.time), y: this.y.get(event.time) },
            initialSize: { x: this.width.get(event.time), y: this.height.get(event.time) }
        };
    }

    viewportEditMouseMove(event: ViewportEditMouseEvent, data: ViewportEditorData): void {
        function set<T>(prop: IAnimatable<T>, value: T) {
            if (prop.animated) prop.set(event.time, value);
            else prop.defaultValue = value;
        }

        if (event.clickedHandle?.uid == "resize-xywh") {
            if (this.origin & Anchor.RowLeft) {
                set(this.x, data.initialPosition.x + (event.parentObjectLocalX - data.initialParentLocal.x));
                set(this.width, data.initialSize.x - (event.localObjectX - data.initialLocal.x));
            } else if (this.origin & Anchor.RowCenter) {
                set(this.x, data.initialPosition.x + (event.parentObjectLocalX - data.initialParentLocal.x) / 2);
                set(this.width, data.initialSize.x - (event.localObjectX - data.initialLocal.x));
            } else if (this.origin & Anchor.RowRight) {
                set(this.width, data.initialSize.x - (event.localObjectX - data.initialLocal.x));
            }

            if (this.origin & Anchor.ColTop) {
                set(this.y, data.initialPosition.y + (event.parentObjectLocalY - data.initialParentLocal.y));
                set(this.height, data.initialSize.y - (event.localObjectY - data.initialLocal.y));
            } else if (this.origin & Anchor.ColMiddle) {
                set(this.y, data.initialPosition.y + (event.parentObjectLocalY - data.initialParentLocal.y) / 2);
                set(this.height, data.initialSize.y - (event.localObjectY - data.initialLocal.y));
            } else if (this.origin & Anchor.ColBottom) {
                set(this.height, data.initialSize.y - (event.localObjectY - data.initialLocal.y));
            }
        } else if (event.clickedHandle?.uid == "resize-wh") {
            if (this.origin & Anchor.RowLeft) {
                set(this.width, data.initialSize.x + (event.localObjectX - data.initialLocal.x));
            } else if (this.origin & Anchor.RowCenter) {
                set(this.x, data.initialPosition.x + (event.parentObjectLocalX - data.initialParentLocal.x) / 2);
                set(this.width, data.initialSize.x + (event.localObjectX - data.initialLocal.x));
            } else if (this.origin & Anchor.RowRight) {
                set(this.x, data.initialPosition.x + (event.parentObjectLocalX - data.initialParentLocal.x));
                set(this.width, data.initialSize.x + (event.localObjectX - data.initialLocal.x));
            }

            if (this.origin & Anchor.ColTop) {
                set(this.height, data.initialSize.y + (event.localObjectY - data.initialLocal.y));
            } else if (this.origin & Anchor.ColMiddle) {
                set(this.y, data.initialPosition.y + (event.parentObjectLocalY - data.initialParentLocal.y) / 2);
                set(this.height, data.initialSize.y + (event.localObjectY - data.initialLocal.y));
            } else if (this.origin & Anchor.ColBottom) {
                set(this.y, data.initialPosition.y + (event.parentObjectLocalY - data.initialParentLocal.y));
                set(this.height, data.initialSize.y + (event.localObjectY - data.initialLocal.y));
            }
        } else if (!event.clickedHandle) {
            set(this.x, data.initialPosition.x + (event.parentObjectLocalX - data.initialParentLocal.x));
            set(this.y, data.initialPosition.y + (event.parentObjectLocalY - data.initialParentLocal.y));
        }
    }
}