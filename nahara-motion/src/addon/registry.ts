import { IAddon } from "./addon.js";

export interface IRegistry<T> extends Iterable<RegistryEntry<T>> {
    get(addon: IAddon, id: string): T | null;
    getId(registerable: T): RegistryIdentifier | null;
}

export interface RegistryEntry<T> {
    readonly addon: IAddon;
    readonly id: string;
    readonly registerable: T;
}

export type RegistryIdentifier = { addon: IAddon, id: string };

/**
 * An addon-bound registry. You don't typically register the registrable object directly; you register it through this
 * registry object, which will unregister your objects when your addon is unloaded.
 */
export interface IAddonBoundRegistry<T> {
    readonly universal: IRegistry<T>;
    register<TT extends T>(id: string, registerable: TT): TT;
    get(addon: IAddon, id: string): T | null;
}

export class Registry<T> implements IRegistry<T> {
    readonly map = new Map<IAddon, Map<string, T>>();
    readonly reverseMap = new Map<T, RegistryIdentifier>();

    constructor(public readonly name: string) {}

    get(addon: IAddon, id: string): T | null {
        return this.map.get(addon)?.get(id) ?? null;
    }

    getId(registerable: T): RegistryIdentifier | null {
        return this.reverseMap.get(registerable) ?? null;
    }

    boundToAddon(addon: IAddon): IAddonBoundRegistry<T> {
        const that = this;
        return {
            universal: this,
            get: (addon, id) => that.get(addon, id),
            register: (id, registerable) => that.register(addon, id, registerable)
        };
    }

    register<TT extends T>(addon: IAddon, id: string, registerable: TT): TT {
        let addonBound = this.map.get(addon);
        if (!addonBound) this.map.set(addon, addonBound = new Map());
        if (addonBound.has(id)) throw new Error(`Already registered: ${this.name}/${id}`);
        addonBound.set(id, registerable);
        this.reverseMap.set(registerable, { addon, id });
        return registerable;
    }

    [Symbol.iterator](): Iterator<RegistryEntry<T>> {
        const addons = this.map.keys();
        const that = this;
        let currentAddon: IAddon | null = null;
        let ids: Iterator<string> | null = null;

        return {
            next() {
                if (ids == null) {
                    const addon = addons.next();
                    if (addon.done) return { done: true, value: null };
                    ids = that.map.get(currentAddon = addon.value)!.keys();
                }

                let id: IteratorResult<string>;

                while ((id = ids.next()).done) {
                    const addon = addons.next();
                    if (addon.done) return { done: true, value: null };
                    ids = that.map.get(currentAddon = addon.value)!.keys();
                }

                return {
                    done: false,
                    value: {
                        addon: currentAddon!,
                        id: id.value,
                        registerable: that.map.get(currentAddon!)!.get(id.value)!
                    }
                };
            }
        };
    }

    unloadAddon(addon: IAddon) {
        const addonBound = this.map.get(addon);
        this.map.delete(addon);
        if (!addonBound) return;
        for (const [, type] of addonBound) this.reverseMap.delete(type);
    }
}