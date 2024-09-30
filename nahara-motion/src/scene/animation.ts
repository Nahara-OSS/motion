import { Color, Vec2, Vec3, Vec4 } from "../types.js";
import { utils } from "../utils.js";
import { easing, Easing } from "./easing.js";

export interface IAnimatable<T> extends Iterable<Keyframe<T>> {
    /**
     * The translation key for this property. Prefix the key with `##` to disable localization. The actual translation
     * key will be `property.<key>.name` for name and `property.<key>.description` for property description.
     */
    readonly translationKey: string;

    /**
     * The default value of this property, if there are no keyframes. This value is always present, regardless whether
     * a keyframe is present. This value is editable by editor.
     */
    defaultValue: T;

    /**
     * Whether this animatable property is animated. In other words, this will be true if there is at least 1 keyframe
     * present in this property.
     */
    readonly animated: boolean;

    /**
     * Get the object that can be serialized into JSON.
     */
    readonly serializable: any;
    fromSerializable(serializable: any): this;

    /**
     * Get the value at given time by interpolating 2 keyframes. It will use the easing function of the second keyframe
     * (the one whose `time` is larger than given time).
     * @param time The time to interpolate and get the value.
     */
    get(time: number): T;

    /**
     * Set a new value at given time, inheriting the easing function from next keyframe. If there is no next keyframe,
     * it will inherit easing from previous. If there are no keyframes, the easing function will be defaulted to
     * `linear`.
     * @param time The time where you want the value to be.
     * @param value The value.
     */
    set(time: number, value: T): Keyframe<T>;

    /**
     * Insert a new keyframe to this property. If the easing function is not provided, it will inherit the function from
     * next keyframe or previous keyframe (if exists). If there are no keyframes, it will use the `linear` function.
     * @param time The time at which the keyframe will be inserted.
     * @param value The value of the keyframe.
     * @param easing The easing function of the keyframe, which is the function that eases between previous value and
     * this keyframe's value.
     * @returns The keyframe.
     */
    insert(time: number, value: T, easing?: Easing): Keyframe<T>;

    /**
     * Modify the existing keyframe with new values. If the value in modification object is not present, it will be
     * ignored. If the keyframe is not in this property, the function will return `null`.
     * @param keyframe The keyframe object or UID of the keyframe.
     * @param modification The modification to apply on the keyframe.
     * @returns The same keyframe.
     */
    modify(keyframe: Keyframe<T> | string, modification: {
        time?: number,
        value?: T,
        easing?: Easing
    }): Keyframe<T> | null;

    /**
     * Delete the keyframe from this property.
     * @param keyframe The keyframe object or UID of the keyframe.
     */
    delete(keyframe: Keyframe<T> | string): boolean;

    /**
     * Get keyframe at exact time.
     * @param time The time to get.
     */
    getKeyframe(time: number): Keyframe<T> | undefined;

    /**
     * Clear all keyframes, making this property uses the default value at all time (until it is animated again). This
     * function will be used by timeline editor (as a "delete animation" button).
     */
    clear(): void;
}

export interface Keyframe<T> {
    /**
     * An unique ID of this keyframe in animatable property to identify. The timeline editor will use this to modify
     * the keyframes.
     */
    readonly uid: string;
    readonly time: number;
    value: T;
    easing: Easing;
}

// TODO
export enum PropertyHint { None }
export type Interpolator<T> = (from: T, to: T, progress: number) => T;

interface ModifiableKeyframe<T> extends Keyframe<T> {
    uid: string;
    time: number;
}

interface SerializableAnimatable<T> {
    defaultValue: T;
    keyframes: ModifiableKeyframe<T>[];
    idCounter?: number;
}

export class Animatable<T> implements IAnimatable<T> {
    keyframes: ModifiableKeyframe<T>[] = [];

    constructor(
        private interpolator: Interpolator<T>,
        public readonly translationKey:
        string, public defaultValue: T
    ) {}

    static scalar(translationKey: string, defaultValue: number = 0) {
        return new Animatable((a, b, p) => a * (1 - p) + b * p, translationKey, defaultValue);
    }

    static vec2(translationKey: string, defaultValue: Vec2 = { x: 0, y: 0 }) {
        return new Animatable((a, b, p) => ({
            x: a.x * (1 - p) + b.x * p,
            y: a.y * (1 - p) + b.y * p
        }), translationKey, defaultValue);
    }

    static vec3(translationKey: string, defaultValue: Vec3 = { x: 0, y: 0, z: 0 }) {
        return new Animatable((a, b, p) => ({
            x: a.x * (1 - p) + b.x * p,
            y: a.y * (1 - p) + b.y * p,
            z: a.z * (1 - p) + b.z * p
        }), translationKey, defaultValue);
    }

    static vec4(translationKey: string, defaultValue: Vec4 = { x: 0, y: 0, z: 0, w: 0 }) {
        return new Animatable((a, b, p) => ({
            x: a.x * (1 - p) + b.x * p,
            y: a.y * (1 - p) + b.y * p,
            z: a.z * (1 - p) + b.z * p,
            w: a.w * (1 - p) + b.w * p
        }), translationKey, defaultValue);
    }

    static color(translationKey: string, defaultValue: Color = { model: "rgba", r: 255, g: 255, b: 255 }) {
        return new Animatable((a, b, p) => ({
            model: "rgba" as "rgba",
            r: a.r * (1 - p) + b.r * p,
            g: a.g * (1 - p) + b.g * p,
            b: a.b * (1 - p) + b.b * p,
            a: (a.a ?? 1) * (1 - p) + (b.a ?? 1) * p
        }), translationKey, defaultValue);
    }

    get serializable(): SerializableAnimatable<T> {
        return {
            defaultValue: structuredClone(this.defaultValue),
            keyframes: structuredClone(this.keyframes)
        };
    }

    fromSerializable(serializable: SerializableAnimatable<T>): this {
        this.defaultValue = structuredClone(serializable.defaultValue);
        this.keyframes = structuredClone(serializable.keyframes).sort((a, b) => a.time - b.time);
        return this;
    }

    get animated(): boolean { return this.keyframes.length > 0; }

    get(time: number): T {
        if (this.keyframes.length == 0) return this.defaultValue;

        const idx = utils.binarySearch<Keyframe<T> | { time: number }>(
            this.keyframes,
            { time },
            (a, b) => a.time - b.time
        );

        if (idx >= 0) return this.keyframes[idx].value;
        const insertAt = -idx - 1;
        if (insertAt == 0) return this.defaultValue;

        const prev = this.keyframes[insertAt - 1];
        const next = this.keyframes[insertAt] ?? { time: time + 1, value: prev.value, easing: prev.easing };
        const progress = (time - prev.time) / (next.time - prev.time);
        return this.interpolator(prev.value, next.value, easing(next.easing, progress));
    }

    set(time: number, value: T): Keyframe<T> {
        const idx = utils.binarySearch<Keyframe<T> | { time: number }>(
            this.keyframes,
            { time },
            (a, b) => a.time - b.time
        );

        if (idx >= 0) {
            this.keyframes[idx].value = value;
            return this.keyframes[idx];
        }

        return this.insert(time, value);
    }

    insert(time: number, value: T, easing?: Easing): Keyframe<T> {
        const kf: ModifiableKeyframe<T> = {
            uid: utils.randomUid(),
            time,
            value,
            easing: easing ?? "linear" // TODO: Inherit
        };
        const idx = utils.binarySearch(this.keyframes, kf, (a, b) => a.time - b.time);
        const insertIdx = idx >= 0 ? idx : -idx - 1;
        this.keyframes.splice(insertIdx, 0, kf);
        return kf;
    }

    modify(
        keyframe: Keyframe<T> | string,
        modification: { time?: number; value?: T | undefined; easing?: Easing; }
    ): Keyframe<T> | null {
        const uid =  typeof keyframe == "string" ? keyframe : keyframe.uid;
        const idx = this.keyframes.findIndex(k => k.uid == uid);
        if (idx == -1) return null;
        const kf = this.keyframes[idx];

        [kf.time, kf.value, kf.easing] = [
            modification.time ?? kf.time,
            modification.value ?? kf.value,
            modification.easing ?? kf.easing
        ];

        if (modification.time != null) this.keyframes.sort((a, b) => a.time - b.time);
        return kf;
    }

    getKeyframe(time: number): Keyframe<T> | undefined {
        const idx = utils.binarySearch<Keyframe<T> | { time: number }>(
            this.keyframes,
            { time },
            (a, b) => a.time - b.time
        );

        return idx >= 0 ? this.keyframes[idx] : undefined;
    }

    delete(keyframe: string | Keyframe<T>): boolean {
        const uid =  typeof keyframe == "string" ? keyframe : keyframe.uid;
        const idx = this.keyframes.findIndex(k => k.uid == uid);
        if (idx == -1) return false;
        this.keyframes.splice(idx, 1);
        return true;
    }

    clear(): void {
        this.keyframes = [];
    }

    [Symbol.iterator](): Iterator<Keyframe<T>, any, undefined> {
        return this.keyframes[Symbol.iterator]();
    }
}