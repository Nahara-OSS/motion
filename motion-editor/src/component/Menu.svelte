<script lang="ts" module>
    export interface MenuContext {
        readonly parentPath: unknown[];
        currentPath: unknown[];
    }

    export const [getMenuContext, setMenuContext] = createContext<MenuContext>();
</script>

<script lang="ts">
    import { createContext, type Snippet } from "svelte";
    import Button from "./Button.svelte";

    const {
        enabled = true,
        toggled = false,
        dynamic = false,
        label,
        onClick,
        children,
    }: {
        enabled?: boolean;
        toggled?: boolean;
        dynamic?: boolean;
        label: Snippet<[]>;
        onClick?: () => unknown;
        children?: Snippet<[]>;
    } = $props();

    let buttonElement = $state<HTMLDivElement | null>(null);
    let menuElement = $state<HTMLDivElement | null>(null);
    let popoverState = $state<string>("closed");
    const parent = getMenuContext();
    const id = crypto.randomUUID();
    const path = [...parent.parentPath, id];

    function onButtonClick() {
        if (onClick) {
            onClick();
            parent.currentPath = [];
        } else if (children) {
            parent.currentPath = path;
        }
    }

    function onPointerEnter() {
        if (parent.currentPath.length > 0 && children) {
            parent.currentPath = path;
        }
    }

    function isMenuActive(): boolean {
        if (path.length > parent.currentPath.length) return false;
        for (let i = 0; i < path.length; i++) if (path[i] != parent.currentPath[i]) return false;
        return true;
    }

    function onBeforeToggle(e: ToggleEvent) {
        popoverState = e.newState;
        if (isMenuActive() && e.newState == "closed") parent.currentPath = [];
    }

    $effect(() => {
        if (isMenuActive()) {
            if (popoverState != "open") menuElement?.showPopover({ source: buttonElement ?? undefined });
        } else {
            if (popoverState != "closed") menuElement?.hidePopover();
        }
    });

    setMenuContext({
        parentPath: path,

        get currentPath() {
            return parent.currentPath;
        },

        set currentPath(path) {
            parent.currentPath = path;
        },
    });
</script>

<div class="button" bind:this={buttonElement}>
    <Button style="toolbar" {enabled} toggled={toggled || isMenuActive()} onClick={onButtonClick} {onPointerEnter}>
        {@render label()}
    </Button>
</div>

{#if children}
    <div
        class="menu"
        class:top-level={parent.parentPath.length == 0}
        popover="auto"
        bind:this={menuElement}
        onbeforetoggle={onBeforeToggle}
    >
        <div class="content">
            {#if !dynamic || popoverState == "open"}
                {@render children()}
            {/if}
        </div>
    </div>
{/if}

<style>
    .button {
        display: flex;
        flex-direction: column;
    }

    .menu {
        position-area: right;
        left: calc(anchor(right) + 0.2rem);
        top: calc(anchor(top) - 0.2rem - 1px);
        margin: 0;
        border: 0;
        padding: 0;
        box-shadow: 0 0 12px #0000000f;

        &.top-level {
            left: anchor(left);
            top: calc(anchor(bottom) - 0.5px);
        }

        > .content {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            padding: 0.2rem;
            border: 1px solid #9f9f9f;
        }
    }
</style>
