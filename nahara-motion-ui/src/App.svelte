<script lang="ts">
    import Button from "./ui/input/Button.svelte";
    import MenuHost from "./ui/menu/MenuHost.svelte";
    import OutlinerPane from "./ui/outliner/OutlinerPane.svelte";
    import PaneHost, { SplitDirection, type PaneLayout } from "./ui/pane/PaneHost.svelte";
    import PropertiesPane from "./ui/properties/PropertiesPane.svelte";
    import TimelinePane from "./ui/timeline/TimelinePane.svelte";
    import ViewportPane from "./ui/viewport/ViewportPane.svelte";

    let layout: PaneLayout = {
        type: "split",
        direction: SplitDirection.LeftToRight,
        firstSize: 300,
        first: {
            type: "split",
            direction: SplitDirection.BottomToTop,
            firstSize: 500,
            first: { type: "tab", tabs: ["files", "project"], selected: "files" },
            second: { type: "tab", tabs: ["outliner"], selected: "outliner" }
        },
        second: {
            type: "split",
            direction: SplitDirection.BottomToTop,
            firstSize: 300,
            first: { type: "tab", tabs: ["timeline", "timingGraph"], selected: "timeline" },
            second: {
                type: "split",
                direction: SplitDirection.RightToLeft,
                firstSize: 300,
                first: { type: "tab", tabs: ["properties", "modifiers"], selected: "properties" },
                second: { type: "tab", tabs: ["viewport"], selected: "viewport" }
            }
        }
    };
</script>

<div class="app">
    <PaneHost {layout} component={type => {
        if (type == "properties") return PropertiesPane;
        if (type == "timeline") return TimelinePane;
        if (type == "outliner") return OutlinerPane;
        if (type == "viewport") return ViewportPane;
        return Button;
    }} on:layoutupdate={e => layout = e.detail} />
    <MenuHost />
</div>

<style lang="scss">
    .app {
        position: relative;
        width: 100%;
        height: 100%;
    }
</style>