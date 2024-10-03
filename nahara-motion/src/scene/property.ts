import { Anchor } from "../anchor.js";
import { IAnimatable } from "./animation.js";

export interface IObjectProperty<T> {
    readonly translationKey: string;
    get(currentTime: number): T;
    set(currentTime: number, value: T): void;
}

export class BasicObjectProperty<T> implements IObjectProperty<T> {
    constructor(
        public readonly translationKey: string,
        public readonly getter: () => T,
        public readonly setter: (value: T) => any
    ) {}

    get(): T {
        return this.getter();
    }

    set(_: number, value: T) {
        this.setter(value);
    }
}

export class AnimatableObjectProperty<T> implements IObjectProperty<T> {
    constructor(public readonly animatable: IAnimatable<T>) {}

    get translationKey() { return this.animatable.translationKey; }

    get(currentTime: number): T {
        return this.animatable.get(currentTime);
    }

    set(currentTime: number, value: T): void {
        if (this.animatable.animated) this.animatable.set(currentTime, value);
        else this.animatable.defaultValue = value;
    }
}

export class EnumObjectProperty<T> implements IObjectProperty<T> {
    constructor(
        public readonly translationKey: string,
        public readonly possibleValues: ArrayLike<T> & Iterable<T>,
        public readonly getter: () => T,
        public readonly setter: (value: T) => any,
        public readonly valueTranslator: (value: T) => string = v => `${v}`
    ) {}

    get(): T {
        return this.getter();
    }

    set(_: number, value: T): void {
        this.setter(value);
    }

    static anchor(translationKey: string, getter: () => Anchor, setter: (value: Anchor) => any) {
        return new EnumObjectProperty(
            translationKey,
            [
                Anchor.TopLeft   , Anchor.TopCenter   , Anchor.TopRight   ,
                Anchor.MiddleLeft, Anchor.MiddleCenter, Anchor.MiddleRight,
                Anchor.BottomLeft, Anchor.BottomCenter, Anchor.BottomRight,
            ],
            getter,
            setter,
            v => {
                switch (v) {
                    case Anchor.TopLeft: return "topLeft";
                    case Anchor.TopCenter: return "topCenter";
                    case Anchor.TopRight: return "topRight";
                    case Anchor.MiddleLeft: return "middleLeft";
                    case Anchor.MiddleCenter: return "middleCenter";
                    case Anchor.MiddleRight: return "middleRight";
                    case Anchor.BottomLeft: return "bottomLeft";
                    case Anchor.BottomCenter: return "bottomCenter";
                    case Anchor.BottomRight: return "bottomRight";
                    default: return `${v}`;
                }
            }
        );
    }
}