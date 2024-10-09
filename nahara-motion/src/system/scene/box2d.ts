import { RenderContext } from "../../render/context.js";
import { Color } from "../../types.js";
import { Animatable, IAnimatable } from "../../scene/animation.js";
import { ISceneObjectType } from "../../scene/object.js";
import { AnimatableObjectProperty, EnumObjectProperty } from "../../scene/property.js";
import { Anchor } from "../../anchor.js";
import { AbstractBoxLikeSceneObject } from "./common.js";

export class Box2D extends AbstractBoxLikeSceneObject {
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
    fill: IAnimatable<Color> = Animatable.color("fill", { model: "rgba", r: 255, g: 255, b: 255, a: 255 });
    stroke: IAnimatable<Color> = Animatable.color("stroke", { model: "rgba", r: 0, g: 0, b: 0, a: 0 });
    lineWidth: IAnimatable<number> = Animatable.scalar("lineWidth", 1);
    cornerRadius: IAnimatable<number> = Animatable.scalar("cornerRadius");

    properties = [
        EnumObjectProperty.anchor("anchor", () => this.anchor, v => this.anchor = v),
        EnumObjectProperty.anchor("origin", () => this.origin, v => this.origin = v),
        new AnimatableObjectProperty(this.x),
        new AnimatableObjectProperty(this.y),
        new AnimatableObjectProperty(this.width),
        new AnimatableObjectProperty(this.height),
        new AnimatableObjectProperty(this.rotation),
        new AnimatableObjectProperty(this.fill),
        new AnimatableObjectProperty(this.stroke),
        new AnimatableObjectProperty(this.lineWidth),
        new AnimatableObjectProperty(this.cornerRadius),
    ];

    render(context: RenderContext): void {
        const { parentToThis, clickableSize } = this.getViewportEditorInfo(context.time, context.containerSize);
        const fill = this.fill.get(context.time);
        const stroke = this.stroke.get(context.time);
        const parent = context.canvas.getTransform();
        const cornerRadius = Math.max(this.cornerRadius.get(context.time), 0);
        const lineWidth = this.lineWidth.get(context.time);

        context.canvas.setTransform(parent.multiply(parentToThis));
        context.canvas.beginPath();
        context.canvas.roundRect(0, 0, clickableSize.x, clickableSize.y, cornerRadius);

        if ((fill.a ?? 255) > 0) {
            context.canvas.fillStyle = `rgba(${fill.r}, ${fill.g}, ${fill.b}, ${(fill.a ?? 255) / 255})`;
            context.canvas.fill();
        }

        if ((stroke.a ?? 255) > 0) {
            context.canvas.strokeStyle = `rgba(${stroke.r}, ${stroke.g}, ${stroke.b}, ${(stroke.a ?? 255) / 255})`;
            context.canvas.lineWidth = lineWidth;
            context.canvas.stroke();
        }

        context.canvas.setTransform(parent);
    }

    static readonly Type: ISceneObjectType<Box2D, {
        anchor: Anchor,
        origin: Anchor,
        x: any,
        y: any,
        width: any,
        height: any,
        rotation: any,
        fill: any,
        stroke: any,
        lineWidth: any,
        cornerRadius: any
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
            out.fill.fromSerializable(data.fill);
            out.stroke.fromSerializable(data.stroke);
            out.lineWidth.fromSerializable(data.lineWidth);
            out.cornerRadius.fromSerializable(data.cornerRadius);
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
                fill: object.fill.serializable,
                stroke: object.stroke.serializable,
                lineWidth: object.lineWidth.serializable,
                cornerRadius: object.cornerRadius.serializable
            };
        },
    };
}