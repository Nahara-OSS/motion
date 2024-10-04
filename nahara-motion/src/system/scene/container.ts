import { Anchor, calculateAnchorPos } from "../../anchor.js";
import { RenderContext } from "../../render/context.js";
import { IAnimatable, Animatable } from "../../scene/animation.js";
import { ISceneObjectWithViewportEditSupport, ViewportEditMouseEvent, ViewportEditorInfo } from "../../scene/editor.js";
import { ISceneObjectWithPositionalData, ISceneObjectWithSizeData, ISceneContainerObject, SceneObjectInfo, ISceneObjectType, objects, ISceneObjectWithRotationData } from "../../scene/object.js";
import { AnimatableObjectProperty, EnumObjectProperty } from "../../scene/property.js";
import { Vec2 } from "../../types.js";

interface ViewportEditorData {
    initialLocal: Vec2,
    initialParentLocal: Vec2,
    initialPosition: Vec2,
    initialSize: Vec2,
}

export class Container implements ISceneObjectWithPositionalData, ISceneObjectWithSizeData, ISceneObjectWithRotationData, ISceneContainerObject, ISceneObjectWithViewportEditSupport<ViewportEditorData> {
    isContainer: true = true;
    isPositional: true = true;
    isSizable: true = true;
    isRotatable: true = true;
    isViewportEditable: true = true;

    anchor: Anchor = Anchor.TopLeft;
    origin: Anchor = Anchor.TopLeft;
    x: IAnimatable<number> = Animatable.scalar("x");
    y: IAnimatable<number> = Animatable.scalar("y");
    width: IAnimatable<number> = Animatable.scalar("width", 100);
    height: IAnimatable<number> = Animatable.scalar("height", 100);
    rotation: IAnimatable<number> = Animatable.scalar("rotation");
    children: SceneObjectInfo[] = [];

    properties = [
        EnumObjectProperty.anchor("anchor", () => this.anchor, v => this.anchor = v),
        EnumObjectProperty.anchor("origin", () => this.origin, v => this.origin = v),
        new AnimatableObjectProperty(this.x),
        new AnimatableObjectProperty(this.y),
        new AnimatableObjectProperty(this.width),
        new AnimatableObjectProperty(this.height),
        new AnimatableObjectProperty(this.rotation),
    ];

    render(context: RenderContext): void {
        const { parentToThis, clickableSize } = this.getViewportEditorInfo(context.time, context.containerSize);
        const parent = context.canvas.getTransform();

        let newContext: RenderContext = {
            canvas: context.canvas,
            containerSize: clickableSize,
            time: context.time,
            timeDelta: context.timeDelta
        };

        context.canvas.setTransform(parent.multiply(parentToThis));
        let objs = this.collect(context.time);
        objs.forEach(obj => obj.object.render(newContext));
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

    get objectsCount(): number { return this.children.length; }

    at(index: number): SceneObjectInfo {
        if (index < 0 || index >= this.children.length)
            throw new Error(`Index out of bounds: ${index} (out of ${this.children.length})`);
        return this.children[index];
    }

    indexOf(object: SceneObjectInfo): number {
        return this.children.indexOf(object);
    }

    add(index: number, object: SceneObjectInfo): void;
    add(object: SceneObjectInfo): number;
    add(a: number | SceneObjectInfo, b?: SceneObjectInfo): number | void {
        if (typeof a == "number") {
            if (a < 0 || a > this.children.length)
                throw new Error(`Index out of bounds: ${a} (out of ${this.children.length})`);
            this.children.splice(a, 0, b!);
            return this.indexOf(b!);
        }

        return this.children.push(a) - 1;
    }

    remove(index: number): SceneObjectInfo;
    remove(object: SceneObjectInfo): void;
    remove(a: number | SceneObjectInfo): void | SceneObjectInfo {
        if (typeof a == "number") {
            if (a < 0 || a >= this.children.length)
                throw new Error(`Index out of bounds: ${a} (out of ${this.children.length})`);
            return this.children.splice(a, 1)[0];
        }

        const index = this.indexOf(a);
        if (index == -1) throw new Error(`Object does not belong to scene`);
        this.remove(index);
    }

    collect(time: number): SceneObjectInfo[] {
        return this.children.filter(obj => time >= obj.timeStart && time < obj.timeEnd);
    }

    [Symbol.iterator](): Iterator<SceneObjectInfo, any, undefined> {
        return this.children[Symbol.iterator]();
    }

    static readonly Type: ISceneObjectType<Container, {
        anchor: Anchor,
        origin: Anchor,
        x: any,
        y: any,
        width: any,
        height: any,
        rotation: any,
        children: any[]
    }> = {
        class: Container,
        name: "Container",
        category: "Grouping",
        createNew: () => new Container(),
        fromSerializable(data) {
            const out = new Container();
            out.anchor = data.anchor;
            out.origin = data.origin;
            out.x.fromSerializable(data.x);
            out.y.fromSerializable(data.y);
            out.width.fromSerializable(data.width);
            out.height.fromSerializable(data.height);
            out.rotation.fromSerializable(data.rotation);
            out.children = data.children.map(objects.fromSerializable).filter(v => !!v);
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
                children: object.children.map(objects.toSerializable)
            };
        },
    };
}