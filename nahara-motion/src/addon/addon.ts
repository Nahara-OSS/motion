import { NaharaMotionSystemAddon } from "../system/nahara.js";
import { utils } from "../utils.js";
import { registries } from "./registries.js";
import { IAddonBoundRegistry, IRegistry, Registry } from "./registry.js";

export interface IAddon {
    /**
     * The display name of the addon. Can have whatever you want.
     */
    readonly name?: string;

    /**
     * Initialize this addon.
     * @param host The addon host.
     */
    init?(host: IAddonHost): Promise<void> | void;

    /**
     * Unload this addon. This does not clean up the addon from universal registries; only releasing the resources used
     * by this addon.
     * @param host The addon host
     */
    unload?(host: IAddonHost): Promise<void> | void;
}

/**
 * This is addon host, which interacts with your addon.
 */
export interface IAddonHost {
    readonly logger: utils.ILogger;

    /**
     * Get the addon-bound registry from universal registry object.
     * @param registry The registry.
     */
    getRegistry<T>(registry: IRegistry<T>): IAddonBoundRegistry<T>;
}

export namespace addons {
    interface InternalAddonInfo {
        readonly addon: IAddon;
        readonly host: IAddonHost;
    }

    class InternalAddonHost implements IAddonHost {
        logger: utils.ILogger;

        constructor(public readonly addon: IAddon, public readonly id: string) {
            this.logger = new utils.Logger(`addons/${id}`);
        }

        getRegistry<T>(registry: IRegistry<T>): IAddonBoundRegistry<T> {
            if (!(registry instanceof Registry)) throw new Error("Not a proper universal registry implementation");
            return registry.boundToAddon(this.addon);
        }
    }

    const map = new Map<string, InternalAddonInfo>();
    const reverseMap = new Map<IAddon, string>();
    const managerLogger = new utils.Logger("addons");

    export function getLoadedAddonIds(): IterableIterator<string> {
        return map.keys();
    }

    export function getAddonById(id: string) {
        return map.get(id)?.addon;
    }

    export function getIdByAddon(addon: IAddon) {
        return reverseMap.get(addon);
    }

    export function addAndLoadAddon(id: string, addon: IAddon) {
        if (map.has(id)) {
            managerLogger.warn(`Addon with ID '${id}' already loaded, ignoring`);
            return false;
        }

        const host = new InternalAddonHost(addon, id);

        try {
            if (addon.init) addon.init(host);
            map.set(id, { addon, host });
            reverseMap.set(addon, id);
            return true;
        } catch (e) {
            managerLogger.error(`Failed to initialize addon '${id}'`, e);
            return false;
        }
    }

    export function unloadAddon(addon: IAddon) {
        if (addon instanceof NaharaMotionSystemAddon || !reverseMap.has(addon)) return false;
        const id = reverseMap.get(addon)!;
        const info = map.get(id)!;

        try {
            if (info.addon.unload) info.addon.unload(info.host);
        } catch (e) {
            managerLogger.error(`Failed to properly unload addon '${id}'. Restart is recommended.`, e);
        }

        map.delete(id);
        reverseMap.delete(addon);
        for (const registry of registries.AllRegistries) (registry as Registry<any>).unloadAddon(addon);
        return true;
    }
}