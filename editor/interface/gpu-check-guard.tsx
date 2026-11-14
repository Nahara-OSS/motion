import * as webgpu from "@nahara/webgpu";
import type { ComponentChildren, ComponentType } from "preact";
import { cx } from "./utils.ts";
import "./gpu-check-guard.css";

const status = await webgpu.checkWebGPUStatus();

export const WebGPUCheckGuard: ComponentType = ({ children }) => {
    if (status.kind == "supported") return children;
    if (status.kind == "no-device") return <NoDevice />;
    if (status.kind == "behind-flag") return <BehindFlag status={status} />;
    if (status.kind == "outdated") return <Outdated status={status} />;
    return <Unsupported />;
};

const friendlyOsNames: Record<webgpu.OperatingSystem, string> = {
    windows: "Windows",
    android: "Android",
    linux: "GNU/Linux",
    darwin: "macOS/iOS/iPadOS",
    freebsd: "FreeBSD",
    netbsd: "NetBSD",
    aix: "AIX",
    illumos: "Illumos",
    solaris: "Solaris",
    unknown: "(unknown operating system)",
};

const friendlyRuntimeNames: Record<webgpu.Runtime, string> = {
    deno: "Deno",
    node: "NodeJS",
    chromium: "Chromium-based browser",
    firefox: "Firefox",
    safari: "Safari",
    unknown: "(unknown browser)",
};

const Scaffold: ComponentType<{ supporting: ComponentChildren }> = ({ supporting, children }) => (
    <div class={cx("nahara-ui-gpu-check-guard")}>
        <div class={cx("content")}>
            {children}
        </div>
        <div class={cx("supporting")}>
            {supporting}
        </div>
    </div>
);

const BehindFlag: ComponentType<{ status: webgpu.WebGPUBehindFlag }> = ({ status }) => (
    <Scaffold supporting={<img src="./wondering-webgpu.png" />}>
        <h1>Browser settings required</h1>
        <p>
            Your browser may supports WebGPU, but it is not enabled at this moment.
        </p>
        <p>
            Enable flag {status.flag} in your {friendlyRuntimeNames[status.runtime]} on {friendlyOsNames[status.os]}
            {" "}
            (version {status.supportedSince} or higher), then relaunch your browser.
        </p>
    </Scaffold>
);

const Outdated: ComponentType<{ status: webgpu.WebGPUOutdated }> = ({ status }) => (
    <Scaffold supporting={<img src="./wondering-unknown.png" />}>
        <h1>Outdated browser!</h1>
        <p>
            Your current browser version does not support WebGPU API, but there is a newer version which supports
            WebGPU.
        </p>
        <p>
            Please update your {friendlyRuntimeNames[status.runtime]} on {friendlyOsNames[status.os]} to version{" "}
            {status.supportedSince}.
        </p>
    </Scaffold>
);

const NoDevice: ComponentType = () => (
    <Scaffold supporting={<img src="./wondering-gpu.png" />}>
        <h1>No GPU?</h1>
        <p>
            Your browser does not let Nahara's Motion access the GPU device.
        </p>
        <p>
            This usually happens when you are using software acceleration, your browser blocked your GPU due to bugs or
            you don't actually have a compatible GPU.
        </p>
    </Scaffold>
);

const Unsupported: ComponentType = () => (
    <Scaffold supporting={<img src="./wondering-webgpu.png" />}>
        <h1>Unsupported browser!</h1>
        <p>
            Your browser does not support WebGPU API, which is required for hardware-accelerated graphics.
        </p>
        <p>
            WebGPU is supported on modern web browsers, such as Chromium-based browsers, Firefox and Safari, on major
            operating systems such as Windows, Linux, macOS and iOS/iPadOS.
        </p>
    </Scaffold>
);
