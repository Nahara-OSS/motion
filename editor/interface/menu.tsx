import {
    type ButtonHTMLAttributes,
    type ComponentChildren,
    type ComponentType,
    createContext,
    type TargetedMouseEvent,
} from "preact";
import { cx, useUUID } from "./utils.ts";
import { Anchored, Origin } from "./front-layer.tsx";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import "./menu.css";

/**
 * Menu open direction
 *
 * Child menu opens in the direction that is inherited from parent, unless the child menu is going to overflow the
 * bounds of the webpage.
 */
export type OpenDirection = { readonly target: Origin; readonly box: Origin };
export const OpenDirection = {
    Up: {
        Left: { target: Origin.BottomLeft, box: Origin.BottomRight } as OpenDirection,
        Right: { target: Origin.BottomRight, box: Origin.BottomLeft } as OpenDirection,
    },
    Down: {
        Left: { target: Origin.TopLeft, box: Origin.TopRight } as OpenDirection,
        Right: { target: Origin.TopRight, box: Origin.TopLeft } as OpenDirection,
    },
};

let currentMenuPath: MenuPath | null = null;
const menuWatchers = new Set<() => void>();
const MenuPath = createContext<MenuPath | null>(null);
const MenuOpenDirection = createContext<OpenDirection>(OpenDirection.Down.Right);
export type MenuPath = readonly [groupId: string, ...menuIds: string[]];

function setCurrentMenuPath(path: MenuPath | null): void {
    currentMenuPath = path;
    for (const watcher of menuWatchers) watcher();
}

function useCurrentMenuPath(): MenuPath | null {
    const [path, setPath] = useState(currentMenuPath);

    useEffect(() => {
        const callback = () => setPath(currentMenuPath);
        menuWatchers.add(callback);
        return () => menuWatchers.delete(callback);
    }, []);

    return path;
}

function useMyMenuPath(): MenuPath {
    const parentPath = useContext(MenuPath);
    const myId = useUUID();
    return parentPath == null ? [myId, myId] : [...parentPath, myId];
}

export const MenuGroup: ComponentType = ({ children }) => {
    const parentPath = useContext(MenuPath);
    const groupId = useUUID();
    if (parentPath != null) throw new Error("<MenuGroup /> cannot be used inside another <MenuGroup />");
    return <MenuPath.Provider value={[groupId]}>{children}</MenuPath.Provider>;
};

const topLevelOpenDirection = {
    "up-left": { target: Origin.TopRight, box: Origin.BottomRight } as OpenDirection,
    "up-right": { target: Origin.TopLeft, box: Origin.BottomLeft } as OpenDirection,
    "down-left": { target: Origin.BottomRight, box: Origin.TopRight } as OpenDirection,
    "down-right": { target: Origin.BottomLeft, box: Origin.TopLeft } as OpenDirection,
};

export const Menu: ComponentType<{
    style?: "generic" | "bordered";
    label: ComponentChildren;
    dirOverride?: OpenDirection;
}> = ({
    style = "generic",
    label,
    dirOverride,
    children,
}) => {
    const parentDir = useContext(MenuOpenDirection);
    const current = useCurrentMenuPath();
    const path = useMyMenuPath();
    const ref = useRef<HTMLButtonElement>(null);
    const topLevel = path.length == 2;
    const visible = current != null && current.length >= path.length && path.every((v, i) => current[i] == v);
    const dir = dirOverride ?? parentDir;
    const blockDir = dir == OpenDirection.Up.Left || dir == OpenDirection.Up.Right ? "up" : "down";
    const inlineDir = dir == OpenDirection.Up.Left || dir == OpenDirection.Down.Left ? "left" : "right";

    useEffect(() => {
        if (!visible || !topLevel) return;

        const handler = (e: PointerEvent) => {
            if (!isMenuUI(e.target)) setCurrentMenuPath(null);
        };

        document.addEventListener("pointerdown", handler);
        return () => document.removeEventListener("pointerdown", handler);
    }, [visible, topLevel]);

    function onPointerOver() {
        if (!topLevel || (current != null && current[0] == path[0])) setCurrentMenuPath(path);
    }

    function onClick() {
        if (topLevel) setCurrentMenuPath(visible ? null : path);
    }

    return (
        <MenuPath.Provider value={path}>
            <button
                type="button"
                class={cx(
                    "nahara-ui-menu-button",
                    topLevel ? "top-level" : "child-item",
                    `style-${style}`,
                    { activated: visible },
                )}
                onPointerOver={onPointerOver}
                onClick={onClick}
                ref={ref}
            >
                {label}
            </button>
            {!visible ? null : (
                <Anchored
                    target={ref}
                    positions={[topLevel ? topLevelOpenDirection[`${blockDir}-${inlineDir}`] : dir]}
                    pointerEvents
                >
                    <MenuOpenDirection.Provider value={dirOverride ?? parentDir}>
                        <div class={cx("nahara-ui-menu", blockDir, inlineDir, { "top-level": topLevel })}>
                            {children}
                        </div>
                    </MenuOpenDirection.Provider>
                </Anchored>
            )}
        </MenuPath.Provider>
    );
};

export const MenuButton: ComponentType<{
    onClick: ButtonHTMLAttributes["onClick"];
    enabled: boolean;
}> = ({
    onClick,
    enabled,
    children,
}) => {
    const path = useMyMenuPath();
    const topLevel = path.length == 2;

    function onButtonClick(e: TargetedMouseEvent<HTMLButtonElement>) {
        if (onClick) onClick(e);
        setCurrentMenuPath(null);
    }

    return (
        <button
            type="button"
            class={cx("nahara-ui-menu-button", topLevel ? "top-level" : "child-item")}
            disabled={!enabled}
            onClick={onButtonClick}
        >
            {children}
        </button>
    );
};

export const MenuSeparator: ComponentType = () => {
    return <div class={cx("nahara-ui-menu-separator")} />;
};

export function bounce(
    dir: OpenDirection,
    hitBlock: "none" | "top" | "bottom",
    hitInline: "none" | "left" | "right",
): OpenDirection {
    let blockDir: "Up" | "Down" = dir == OpenDirection.Up.Left || dir == OpenDirection.Up.Right ? "Up" : "Down";
    let inlineDir: "Left" | "Right" = dir == OpenDirection.Up.Left || dir == OpenDirection.Down.Left ? "Left" : "Right";
    if (blockDir == "Up" && hitBlock == "top") blockDir = "Down";
    if (blockDir == "Down" && hitBlock == "bottom") blockDir = "Up";
    if (inlineDir == "Left" && hitInline == "left") inlineDir = "Right";
    if (inlineDir == "Right" && hitInline == "right") inlineDir = "Left";
    return OpenDirection[blockDir][inlineDir];
}

function isMenuUI(target: unknown): boolean {
    return target != null && target instanceof Element && (
        target.classList.contains("nahara-ui-menu") ||
        target.classList.contains("nahara-ui-menu-button") ||
        target.classList.contains("nahara-ui-menu-separator") ||
        isMenuUI(target.parentElement)
    );
}
