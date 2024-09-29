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
        public readonly possibleValues: ArrayLike<T>,
        public readonly getter: () => T,
        public readonly setter: (value: T) => any
    ) {}

    get(): T {
        return this.getter();
    }

    set(_: number, value: T): void {
        this.setter(value);
    }
}