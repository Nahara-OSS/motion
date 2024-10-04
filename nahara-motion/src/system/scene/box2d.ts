import { RenderContext } from "../../render/context.js";
import { Color, Vec2 } from "../../types.js";
import { Animatable, IAnimatable } from "../../scene/animation.js";
import { ISceneObjectType, ISceneObjectWithPositionalData, ISceneObjectWithRotationData, ISceneObjectWithSizeData } from "../../scene/object.js";
import { AnimatableObjectProperty, EnumObjectProperty } from "../../scene/property.js";
import { Anchor, calculateAnchorPos } from "../../anchor.js";
import { ISceneObjectWithViewportEditSupport, ViewportEditMouseEvent, ViewportEditorInfo } from "../../scene/editor.js";

interface ViewportEditorData {
    initialLocal: Vec2,
    initialParentLocal: Vec2,
    initialPosition: Vec2,
    initialSize: Vec2,
}

export class Box2D implements ISceneObjectWithPositionalData, ISceneObjectWithSizeData, ISceneObjectWithRotationData, ISceneObjectWithViewportEditSupport<ViewportEditorData> {
    isViewportEditable: true = true;
    isPositional: true = true;
    isSizable: true = true;
    isRotatable: true = true;

    anchor: Anchor = Anchor.TopLeft;
    origin: Anchor = Anchor.TopLeft;
    x: IAnimatable<number> = Animatable.scalar("x");
    y: IAnimatable<number> = Animatable.scalar("y");
    width: IAnimatable<number> = Animatable.scalar("width", 100);
    height: IAnimatable<number> = Animatable.scalar("height", 100);
    rotation: IAnimatable<number> = Animatable.scalar("rotation");
    color: IAnimatable<Color> = Animatable.color("color", { model: "rgba", r: 255, g: 255, b: 255, a: 255 });

    properties = [
        EnumObjectProperty.anchor("anchor", () => this.anchor, v => this.anchor = v),
        EnumObjectProperty.anchor("origin", () => this.origin, v => this.origin = v),
        new AnimatableObjectProperty(this.x),
        new AnimatableObjectProperty(this.y),
        new AnimatableObjectProperty(this.width),
        new AnimatableObjectProperty(this.height),
        new AnimatableObjectProperty(this.rotation),
        new AnimatableObjectProperty(this.color),
    ];

    render(context: RenderContext): void {
        const { parentToThis, clickableSize } = this.getViewportEditorInfo(context.time, context.containerSize);
        const color = this.color.get(context.time);
        const parent = context.canvas.getTransform();
        context.canvas.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(color.a ?? 255) / 255})`;
        context.canvas.setTransform(parent.multiply(parentToThis));
        context.canvas.fillRect(0, 0, clickableSize.x, clickableSize.y);
        context.canvas.setTransform(parent);
    }

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
        const parent = context.canvas.getTransform();
        context.canvas.setTransform(parent.multiply(parentToThis));
        context.canvas.lineWidth = 4 / viewportScale;
        context.canvas.strokeStyle = "#0007";
        context.canvas.strokeRect(0, 0, clickableSize.x, clickableSize.y);
        context.canvas.lineWidth = 2 / viewportScale;
        context.canvas.strokeStyle = objectColor;
        context.canvas.strokeRect(0, 0, clickableSize.x, clickableSize.y);

        // TODO move these to new superclass
        const originPos = calculateAnchorPos(clickableSize, this.origin);
        context.canvas.beginPath();
        context.canvas.moveTo(originPos.x - 5 / viewportScale, originPos.y - 5 / viewportScale);
        context.canvas.lineTo(originPos.x + 5 / viewportScale, originPos.y + 5 / viewportScale);
        context.canvas.moveTo(originPos.x + 5 / viewportScale, originPos.y - 5 / viewportScale);
        context.canvas.lineTo(originPos.x - 5 / viewportScale, originPos.y + 5 / viewportScale);

        context.canvas.lineWidth = 4 / viewportScale;
        context.canvas.strokeStyle = "#0007";
        context.canvas.stroke();
        context.canvas.lineWidth = 2 / viewportScale;
        context.canvas.strokeStyle = objectColor;
        context.canvas.stroke();

        context.canvas.setTransform(parent);
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

    static readonly Type: ISceneObjectType<Box2D, {
        anchor: Anchor,
        origin: Anchor,
        x: any,
        y: any,
        width: any,
        height: any,
        rotation: any,
        color: any
    }> = {
        class: Box2D,
        name: "Box",
        category: "Graphics",
        createNew: () => new Box2D(),
        fromSerializable(data) {
            const out = new Box2D();
            out.anchor = data.anchor;
            out.origin = data.origin;
            out.x.fromSerializable(data.x);
            out.y.fromSerializable(data.y);
            out.width.fromSerializable(data.width);
            out.height.fromSerializable(data.height);
            out.rotation.fromSerializable(data.rotation);
            out.color.fromSerializable(data.color)
            return out;
        },
        toSerializable(object) {
            return {
                anchor: object.anchor,
                origin: object.origin,
                x: object.x.serializable,
                y: object.y.serializable,
                width: object.width.serializable,
                height: object.height.serializable,
                rotation: object.rotation.serializable,
                color: object.color.serializable
            };
        },
    };
}