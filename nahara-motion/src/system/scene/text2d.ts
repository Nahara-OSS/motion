import { RenderContext } from "../../render/context.js";
import { IAnimatable, Animatable } from "../../scene/animation.js";
import { ISceneObjectWithPositionalData, IObjectProperty, ISceneObjectType } from "../../scene/object.js";
import { Color } from "../../types.js";

export class Text2D implements ISceneObjectWithPositionalData {
    isPositional: true = true;
    isViewportEditable: true = true;
    x: IAnimatable<number> = Animatable.scalar("x");
    y: IAnimatable<number> = Animatable.scalar("y");
    scaleX: IAnimatable<number> = Animatable.scalar("scaleX", 1);
    scaleY: IAnimatable<number> = Animatable.scalar("scaleY", 1);
    content: string = "Sample Text";
    font: string = "Inter";
    cjkVertical: boolean = false;
    size: IAnimatable<number> = Animatable.scalar("size", 14);
    color: IAnimatable<Color> = Animatable.color("color");

    properties = [
        this.x,
        this.y,
        this.scaleX,
        this.scaleY,
        {
            isSimple: true,
            translationKey: "content",
            get: () => this.content,
            set: newContent => this.content = newContent
        } as IObjectProperty<string>,
        {
            isSimple: true,
            translationKey: "font",
            get: () => this.font,
            set: newFont => this.font = newFont
        } as IObjectProperty<string>,
        {
            isSimple: true,
            translationKey: "cjkVertical",
            get: () => this.cjkVertical,
            set: newState => this.cjkVertical = newState
        } as IObjectProperty<boolean>,
        this.size,
        this.color
    ];

    render(context: RenderContext): void {
        const x = this.x.get(context.time);
        const y = this.y.get(context.time);
        const scaleX = this.scaleX.get(context.time);
        const scaleY = this.scaleY.get(context.time);
        const size = this.size.get(context.time);
        const color = this.color.get(context.time);
        context.canvas.font = `${size}px ${this.font}`;
        context.canvas.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 255})`;
        context.canvas.save();
        context.canvas.translate(x, y);
        context.canvas.scale(scaleX, scaleY);

        if (this.cjkVertical) {
            // Special vertical rendering for CJKV characters
            // TODO handle full stop (。) properly

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

    static readonly Type: ISceneObjectType<Text2D, {
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