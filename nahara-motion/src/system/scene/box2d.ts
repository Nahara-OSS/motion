import { RenderContext } from "../../render/context.js";
import { Color } from "../../types.js";
import { Animatable, IAnimatable } from "../../scene/animation.js";
import { ISceneObjectType, ISceneObjectWithPositionalData, ISceneObjectWithSizeData } from "../../scene/object.js";

export class Box2D implements ISceneObjectWithPositionalData, ISceneObjectWithSizeData {
    isViewportEditable: true = true;
    isPositional: true = true;
    isSizable: true = true;
    x: IAnimatable<number> = Animatable.scalar("x");
    y: IAnimatable<number> = Animatable.scalar("y");
    width: IAnimatable<number> = Animatable.scalar("width", 100);
    height: IAnimatable<number> = Animatable.scalar("height", 100);
    color: IAnimatable<Color> = Animatable.color("color", { model: "rgba", r: 255, g: 255, b: 255, a: 255 });

    properties = [
        this.x,
        this.y,
        this.width,
        this.height,
        this.color
    ];

    render(context: RenderContext): void {
        const x = this.x.get(context.time);
        const y = this.y.get(context.time);
        const width = this.width.get(context.time);
        const height = this.height.get(context.time);
        const color = this.color.get(context.time);
        context.canvas.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 255})`;
        context.canvas.fillRect(x, y, width, height);
    }

    static readonly Type: ISceneObjectType<Box2D, {
        x: any,
        y: any,
        width: any,
        height: any,
        color: any
    }> = {
        class: Box2D,
        name: "Box",
        category: "Graphics",
        createNew: () => new Box2D(),
        fromSerializable(data) {
            const out = new Box2D();
            out.x.fromSerializable(data.x);
            out.y.fromSerializable(data.y);
            out.width.fromSerializable(data.width);
            out.height.fromSerializable(data.height);
            out.color.fromSerializable(data.color)
            return out;
        },
        toSerializable(object) {
            return {
                x: object.x.serializable,
                y: object.y.serializable,
                width: object.width.serializable,
                height: object.height.serializable,
                color: object.color.serializable
            };
        },
    };
}