import { RenderContext } from "../../render/context.js";
import { Color } from "../../types.js";
import { Animatable, IAnimatable } from "../../scene/animation.js";
import { ISceneObjectType, ISceneObjectWithPositionalData, ISceneObjectWithRotationData, ISceneObjectWithSizeData } from "../../scene/object.js";
import { AnimatableObjectProperty, EnumObjectProperty } from "../../scene/property.js";
import { Anchor, calculateAnchorPos } from "../../anchor.js";

export class Box2D implements ISceneObjectWithPositionalData, ISceneObjectWithSizeData, ISceneObjectWithRotationData {
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
        const offsetX = this.x.get(context.time);
        const offsetY = this.y.get(context.time);
        const width = this.width.get(context.time);
        const height = this.height.get(context.time);
        const rotation = this.rotation.get(context.time);
        const color = this.color.get(context.time);

        const posInParent = calculateAnchorPos(context.containerSize, this.anchor);
        const posInSelf = calculateAnchorPos({ x: width, y: height }, this.origin);

        context.canvas.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(color.a ?? 255) / 255})`;
        context.canvas.translate(posInParent.x + offsetX, posInParent.y + offsetY);
        context.canvas.rotate(rotation * Math.PI / 180);
        context.canvas.translate(-posInSelf.x, -posInSelf.y);
        context.canvas.fillRect(0, 0, width, height);
        context.canvas.translate(posInSelf.x, posInSelf.y);
        context.canvas.rotate(-(rotation * Math.PI / 180));
        context.canvas.translate(-posInParent.x - offsetX, -posInParent.y - offsetY);
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