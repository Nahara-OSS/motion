const assetRoot = new URL("build/static/", import.meta.url);

declare namespace DenoExt {
    export class BrowserWindow extends EventTarget {
        readonly windowId: number;
        public constructor(options?: BrowserWindowOptions);
        show(): void;
        hide(): void;
        focus(): void;
        close(): void;
        reload(): void;
        isClosed(): boolean;
        isVisible(): boolean;
        setSize(width: number, height: number): void;
        setPosition(x: number, y: number): void;
        setResizable(resizable: boolean): void;
        setAlwaysOnTop(alwaysOnTop: boolean): void;
        setTitle(title: string): void;
        navigate(url: string): void;
        executeJs(js: string): unknown;
        getNativeWindow(): Deno.UnsafeWindowSurface;
        openDevtools(options: { deno?: boolean; renderer?: boolean }): void;
        addEventListener<T extends keyof BrowserWindowEventMap>(
            type: T,
            listener: (this: BrowserWindow, ev: BrowserWindowEventMap[T]) => void,
            options?: boolean | AddEventListenerOptions,
        ): void;
        addEventListener(
            type: string,
            listener: EventListenerOrEventListenerObject | null,
            options?: boolean | AddEventListenerOptions,
        ): void;
        removeEventListener<T extends keyof BrowserWindowEventMap>(
            type: T,
            listener: (this: BrowserWindow, ev: BrowserWindowEventMap[T]) => void,
            options?: boolean | AddEventListenerOptions,
        ): void;
        removeEventListener(
            type: string,
            callback: EventListenerOrEventListenerObject | null,
            options?: EventListenerOptions | boolean,
        ): void;
    }

    export interface BrowserWindowOptions {
        title?: string;
        width?: number;
        height?: number;
        x?: number;
        y?: number;
        resizable?: boolean;
        alwaysOnTop?: boolean;
        frameless?: boolean;
        noActive?: boolean;
        transparentTitleBar?: boolean;
    }

    interface BrowserWindowEventMap {
        "resize": CustomEvent<BrowserWindowResizeDetail>;
        "move": CustomEvent<BrowserWindowMoveDetail>;
        "focus": FocusEvent;
        "blur": FocusEvent;
        "load": Event;
        "close": Event;
        "keydown": KeyboardEvent;
        "keyup": KeyboardEvent;
        "mousemove": MouseEvent;
        "mouseenter": MouseEvent;
        "mouseleave": MouseEvent;
        "mousedown": MouseEvent;
        "mouseup": MouseEvent;
        "click": MouseEvent;
        "dblclick": MouseEvent;
        "wheel": WheelEvent;
        "menuclick": CustomEvent<MenuClickDetail>;
        "contextmenuclick": CustomEvent<MenuClickDetail>;
    }

    export interface BrowserWindowResizeDetail {
        width: number;
        height: number;
    }

    export interface BrowserWindowMoveDetail {
        x: number;
        y: number;
    }

    export interface MenuClickDetail {
        id: string;
    }
}

if ("BrowserWindow" in Deno) {
    const mainWindow = new (Deno as unknown as typeof DenoExt).BrowserWindow({
        title: "Nahara's Motion",
        width: 1920,
        height: 1080,
    });
    console.log(mainWindow);
} else {
    console.warn("%cwarn %cRunning in server mode", "color:yellow", "");
}

Deno.serve(async (req) => {
    const reqUrl = new URL(req.url);
    return await serveStatic(reqUrl.pathname);
});

const contentTypes: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".webmanifest": "application/json; charset=utf-8",
};

const pathMap: Record<string, URL> = {
    "/": new URL("app.html", assetRoot),
    "/index.html": new URL("app.html", assetRoot),
};

async function serveStatic(pathname: string): Promise<Response> {
    const assetUrl = pathMap[pathname] ?? new URL(pathname.replace(/^\/+/, ""), assetRoot);

    try {
        const content = await Deno.readFile(assetUrl);
        const ext = assetUrl.pathname.slice(assetUrl.pathname.lastIndexOf("."));
        const contentType = contentTypes[ext] ?? "application/octet-stream";

        return new Response(content, {
            headers: {
                "Content-Type": contentType,
            },
        });
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
            return new Response(`Not found (requesting ${pathname}, resolved to asset at ${assetUrl.pathname})`, {
                status: 404,
            });
        } else {
            throw e;
        }
    }
}
