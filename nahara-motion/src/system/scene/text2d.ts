import { Anchor, calculateAnchorPos } from "../../anchor.js";
import { RenderContext } from "../../render/context.js";
import { IAnimatable, Animatable } from "../../scene/animation.js";
import { ISceneObjectWithViewportEditSupport, ViewportEditMouseEvent, ViewportEditorInfo } from "../../scene/editor.js";
import { ISceneObjectWithPositionalData, ISceneObjectType } from "../../scene/object.js";
import { AnimatableObjectProperty, BasicObjectProperty, EnumObjectProperty } from "../../scene/property.js";
import { Color, Vec2 } from "../../types.js";

interface ViewportEditorData {
    initialLocal: Vec2,
    initialParentLocal: Vec2,
    initialPosition: Vec2,
    initialScale: Vec2,
    initialSize: number,
}

export class Text2D implements ISceneObjectWithPositionalData, ISceneObjectWithViewportEditSupport<ViewportEditorData> {
    isPositional: true = true;
    isViewportEditable: true = true;

    anchor: Anchor = Anchor.TopLeft;
    origin: Anchor = Anchor.TopLeft;
    x: IAnimatable<number> = Animatable.scalar("x");
    y: IAnimatable<number> = Animatable.scalar("y");
    scaleX: IAnimatable<number> = Animatable.scalar("scaleX", 1);
    scaleY: IAnimatable<number> = Animatable.scalar("scaleY", 1);
    content: string = "Sample Text";
    font: string = "Inter";
    cjkVertical: boolean = false;
    size: IAnimatable<number> = Animatable.scalar("size", 28);
    color: IAnimatable<Color> = Animatable.color("color");

    properties = [
        EnumObjectProperty.anchor("anchor", () => this.anchor, v => this.anchor = v),
        EnumObjectProperty.anchor("origin", () => this.origin, v => this.origin = v),
        new AnimatableObjectProperty(this.x),
        new AnimatableObjectProperty(this.y),
        new AnimatableObjectProperty(this.scaleX),
        new AnimatableObjectProperty(this.scaleY),
        new BasicObjectProperty("content", () => this.content, newContent => this.content = newContent),
        new BasicObjectProperty("font", () => this.font, newFont => this.font = newFont),
        new BasicObjectProperty("cjkVertical", () => this.cjkVertical, state => this.cjkVertical = state),
        new AnimatableObjectProperty(this.size),
        new AnimatableObjectProperty(this.color),
    ];

    render(context: RenderContext): void {
        const x = this.x.get(context.time);
        const y = this.y.get(context.time);
        const scaleX = this.scaleX.get(context.time);
        const scaleY = this.scaleY.get(context.time);
        const size = this.size.get(context.time);
        const color = this.color.get(context.time);
        context.canvas.font = `${size}px ${this.font}`;
        context.canvas.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(color.a ?? 255) / 255})`;

        const lines = this.cjkVertical ? Math.max(this.content.length, 1) : 1;
        const effectiveWidth = lines == 1 ? context.canvas.measureText(this.content).width : size;
        const effectiveHeight = size * lines;
        const posInParent = calculateAnchorPos(context.containerSize, this.anchor);
        const posInSelf = calculateAnchorPos({ x: effectiveWidth, y: effectiveHeight }, this.origin);

        context.canvas.save();
        context.canvas.translate(posInParent.x, posInParent.y);
        context.canvas.translate(-posInSelf.x + x, -posInSelf.y + y);
        context.canvas.scale(scaleX, scaleY);
        context.canvas.textBaseline = "top";

        if (this.cjkVertical) {
            // Special vertical rendering for CJKV characters
            // TODO handle full stop (。) properly
            // TODO allow modifiers to apply on each character (a.k.a instances)

            for (const char of this.content) {
                context.canvas.fillText(char, 0, 0);
                context.canvas.translate(0, size);
            }
        } else {
            context.canvas.scale(scaleX, scaleY);
            context.canvas.fillText(this.content, 0, 0);
        }

        context.canvas.restore();
    }

    getViewportEditorInfo(time: number, parentSize: Vec2): ViewportEditorInfo {
        const x = this.x.get(time);
        const y = this.y.get(time);
        const scaleX = this.scaleX.get(time);
        const scaleY = this.scaleY.get(time);
        const size = this.size.get(time);
        const lines = this.cjkVertical ? Math.max(this.content.length, 1) : 1;
        const posInParent = calculateAnchorPos(parentSize, this.anchor);
        const posInSelf = calculateAnchorPos({ x: size * scaleX, y: size * scaleY * lines }, this.origin);

        return {
            parentToThis: new DOMMatrix().translate(posInParent.x - posInSelf.x + x, posInParent.y - posInSelf.y + y),
            clickableSize: {
                x: size * scaleX,
                y: size * scaleY * lines
            },
            handles: [
                {
                    uid: "resize",
                    hint: "resize-bottom-right",
                    offsetX: size * scaleX,
                    offsetY: size * scaleY * lines
                },
                {
                    uid: "scale-x",
                    hint: "resize-right",
                    offsetX: size * scaleX,
                    offsetY: size * scaleY * lines / 2
                },
                {
                    uid: "scale-y",
                    hint: "resize-bottom",
                    offsetX: size * scaleX / 2,
                    offsetY: size * scaleY * lines
                }
            ]
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

        const originPos = calculateAnchorPos(clickableSize, this.origin);
        context.canvas.beginPath();
        context.canvas.moveTo(originPos.x - 5 / viewportScale, originPos.y - 5 / viewportScale);
        context.canvas.lineTo(originPos.x + 5 / viewportScale, originPos.y + 5 / viewportScale);
        context.canvas.moveTo(originPos.x + 5 / viewportScale, originPos.y - 5 / viewportScale);
        context.canvas.lineTo(originPos.x - 5 / viewportScale, originPos.y + 5 / viewportScale);
        // TODO draw anchor (a.k.a position on parent)

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
            initialScale: { x: this.scaleX.get(event.time), y: this.scaleY.get(event.time) },
            initialSize: this.size.get(event.time)
        };
    }

    viewportEditMouseMove(event: ViewportEditMouseEvent, data: ViewportEditorData): void {
        function set<T>(prop: IAnimatable<T>, value: T) {
            if (prop.animated) prop.set(event.time, value);
            else prop.defaultValue = value;
        }

        if (event.clickedHandle?.uid == "resize") {
            set(this.size, data.initialSize + (event.localObjectX - data.initialLocal.x) / data.initialScale.x);
        } else if (event.clickedHandle?.uid == "scale-x") {
            const initialSize = data.initialSize * data.initialScale.x;
            const targetSize = initialSize + event.localObjectX - data.initialLocal.x;
            const targetScale = targetSize / data.initialSize;
            set(this.scaleX, targetScale);
        } else if (event.clickedHandle?.uid == "scale-y") {
            const lines = this.cjkVertical ? Math.max(this.content.length, 1) : 1;
            const initialSize = data.initialSize * data.initialScale.y * lines;
            const targetSize = initialSize + event.localObjectY - data.initialLocal.y;
            const targetScale = targetSize / (data.initialSize * lines);
            set(this.scaleY, targetScale);
        } else {
            set(this.x, data.initialPosition.x + (event.parentObjectLocalX - data.initialParentLocal.x));
            set(this.y, data.initialPosition.y + (event.parentObjectLocalY - data.initialParentLocal.y));
        }
    }

    static readonly Type: ISceneObjectType<Text2D, {
        anchor: Anchor,
        origin: Anchor,
        x: any,
        y: any,
        scaleX: any,
        scaleY: any,
        content: string,
        font: string,
        cjkVertical: boolean,
        size: any,
        color: any
    }> = {
        class: Text2D,
        name: "Text",
        category: "Graphics",
        createNew: () => new Text2D(),
        fromSerializable(data) {
            const out = new Text2D();
            out.anchor = data.anchor;
            out.origin = data.origin;
            out.x.fromSerializable(data.x);
            out.y.fromSerializable(data.y);
            out.scaleX.fromSerializable(data.scaleX);
            out.scaleY.fromSerializable(data.scaleY);
            out.size.fromSerializable(data.size);
            out.color.fromSerializable(data.color);
            out.content = data.content;
            out.font = data.font;
            out.cjkVertical = data.cjkVertical;
            return out;
        },
        toSerializable(object) {
            return {
                anchor: object.anchor,
                origin: object.origin,
                x: object.x.serializable,
                y: object.y.serializable,
                scaleX: object.scaleX.serializable,
                scaleY: object.scaleY.serializable,
                content: object.content,
                font: object.font,
                cjkVertical: object.cjkVertical,
                size: object.size.serializable,
                color: object.color.serializable
            };
        },
    };
}