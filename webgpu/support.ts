export type WebGPUStatus =
    | WebGPUSupported
    | WebGPUNoDevice
    | WebGPUBehindFlag
    | WebGPUOutdated
    | WebGPUUnsupported;

/**
 * WebGPU API is supported and GPU device is detected
 */
export interface WebGPUSupported {
    readonly kind: "supported";
    readonly deviceId: string;
    readonly deviceName: string;
    readonly vendor: string;
    readonly architecture: string;
    readonly isFallback: boolean;
}

/**
 * WebGPU API is supported, but no GPU device found
 *
 * Usually this "no device" error is caused by:
 *
 * - GPU device is blocklisted by runtime (usually happens with software acceleration);
 * - GPU device is actually missing.
 */
export interface WebGPUNoDevice {
    readonly kind: "no-device";
}

/**
 * WebGPU API is not supported, but a newer version of the runtime supports it
 */
export interface WebGPUBehindFlag {
    readonly kind: "behind-flag";
    readonly runtime: Runtime;
    readonly os: OperatingSystem;
    readonly supportedSince: string;
    readonly flag: string;
}

/**
 * WebGPU API is not supported and there is no newer version of the same runtime that supports it
 */
export interface WebGPUOutdated {
    readonly kind: "outdated";
    readonly runtime: Runtime;
    readonly os: OperatingSystem;
    readonly supportedSince: string;
}

export interface WebGPUUnsupported {
    readonly kind: "unsupported";
}

export type Runtime =
    | "deno"
    | "node"
    | "chromium"
    | "firefox"
    | "safari"
    | "unknown";

export type OperatingSystem =
    | "windows"
    | "linux"
    | "darwin"
    | "android"
    | "freebsd"
    | "netbsd"
    | "aix"
    | "solaris"
    | "illumos"
    | "unknown";

/**
 * Check whether WebGPU is supported in current environment
 *
 * The information is for diagnostics only (as well as giving user instructions on how to fix the issue). It should not
 * be used to perform "autofix" as returned information might be inaccurate.
 *
 * @returns WebGPU support status
 */
export async function checkWebGPUStatus(): Promise<WebGPUStatus> {
    if ("gpu" in navigator) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter == null) return { kind: "no-device" };

        return {
            kind: "supported",
            deviceId: adapter.info.device,
            deviceName: adapter.info.description,
            vendor: adapter.info.vendor,
            architecture: adapter.info.architecture,
            isFallback: adapter.info.isFallbackAdapter,
        };
    }

    // sync with https://github.com/gpuweb/gpuweb/wiki/Implementation-Status
    const { runtime, os } = whereAmI();

    if (runtime == "deno") {
        return { kind: "outdated", runtime: "deno", os: "unknown", supportedSince: "2.9.8" };
    }

    if (runtime == "node") {
        // TODO: do we mention polyfill here?
        return { kind: "unsupported" };
    }

    if (runtime == "chromium") {
        if (os == "windows") return { kind: "outdated", runtime: "chromium", os: "windows", supportedSince: "113" };
        if (os == "android") return { kind: "outdated", runtime: "chromium", os: "android", supportedSince: "139" };
        if (os == "linux") {
            return {
                kind: "behind-flag",
                runtime: "chromium",
                os: "linux",
                supportedSince: "147",
                flag: [
                    "--enable-unsafe-webgpu",
                    "--ozone-platform=x11",
                    "--use-angle=vulkan",
                    "--enable-features=Vulkan,VulkanFromANGLE",
                ].join(" "),
            };
        }
    }

    if (runtime == "firefox") {
        if (os == "windows") return { kind: "outdated", runtime: "firefox", os: "windows", supportedSince: "141" };
        if (os == "darwin") return { kind: "outdated", runtime: "firefox", os: "darwin", supportedSince: "147" };
        if (os == "linux") {
            return {
                kind: "behind-flag",
                runtime: "firefox",
                os: "linux",
                supportedSince: "159",
                flag: "dom.webgpu.enabled",
            };
        }
    }

    if (runtime == "safari") {
        return { kind: "outdated", runtime: "safari", os: "darwin", supportedSince: "26" };
    }

    return {
        kind: "unsupported",
    };
}

export interface WhereAmI {
    readonly runtime: Runtime;
    readonly version: string | null;
    readonly os: OperatingSystem;
}

export function whereAmI(): WhereAmI {
    const ua: (readonly [name: string, version: string])[] = [];

    for (const [_matched, name, version] of navigator.userAgent.matchAll(/([\w.]+?)\/((?:\d+\.?)+)/g)) {
        ua.push([name, version]);
    }

    let runtime: Runtime;
    let version: string | null;
    let os: OperatingSystem;

    const poi = ua.find(([name]) => name == "Deno") ??
        ua.find(([name]) => name == "Node.js") ??
        ua.find(([name]) => name == "Chromium" || name == "Chrome") ??
        ua.find(([name]) => name == "Firefox") ??
        ua.find(([name]) => name == "Safari");

    if (poi == null) {
        runtime = "unknown";
        version = null;
    } else {
        version = poi[1];
        switch (poi[0]) {
            case "Deno":
                runtime = "deno";
                break;
            case "Node.js":
                runtime = "node";
                break;
            case "Chromium":
            case "Chrome":
                runtime = "chromium";
                break;
            case "Firefox":
                runtime = "firefox";
                break;
            case "Safari":
                runtime = "safari";
                break;
            default:
                runtime = "unknown";
                break;
        }
    }

    if (runtime == "deno") os = Deno.build.os;
    else if (runtime == "node") os = require("node:os").platform();
    else if (navigator.platform.includes("Linux")) os = "linux";
    else if (navigator.platform.includes("Win32")) os = "windows";
    else if (navigator.platform.includes("Mac") || navigator.platform == "iPhone") os = "darwin";
    else if (navigator.platform.includes("Android")) os = "android";
    else os = "unknown";

    return {
        runtime,
        version,
        os,
    };
}
