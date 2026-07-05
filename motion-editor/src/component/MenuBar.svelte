<script lang="ts">
    import type { Snippet } from "svelte";
    import Toolbar from "./Toolbar.svelte";
    import { setMenuContext } from "./Menu.svelte";

    const { children }: { children: Snippet<[]> } = $props();

    let currentPath = $state.raw<unknown[]>([]);

    setMenuContext({
        parentPath: [],

        get currentPath() {
            return currentPath;
        },

        set currentPath(path) {
            currentPath = path;
        },
    });
</script>

<Toolbar>
    {@render children()}
</Toolbar>
