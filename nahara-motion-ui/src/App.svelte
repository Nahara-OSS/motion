<script lang="ts">
    import MediaBar from "./ui/bar/MediaBar.svelte";
    import TopBar from "./ui/bar/TopBar.svelte";
    import MenuHost from "./ui/menu/MenuHost.svelte";
    import OutlinerPane from "./ui/outliner/OutlinerPane.svelte";
    import PaneHost, { SplitDirection, type PaneLayout, type TabState } from "./ui/pane/PaneHost.svelte";
    import PropertiesPane from "./ui/properties/PropertiesPane.svelte";
    import TimelinePane from "./ui/timeline/TimelinePane.svelte";
    import ViewportPane from "./ui/viewport/ViewportPane.svelte";
    import PopupHost from "./ui/popup/PopupHost.svelte";
    import AnimationGraphPane from "./ui/graph/AnimationGraphPane.svelte";
    import EmptyPane from "./ui/pane/EmptyPane.svelte";

    let states: Record<string, TabState> = {
        "default-files": { type: "files", state: {} },
        "default-project": { type: "project", state: {} },
        "default-outliner": { type: "outliner", state: {} },
        "default-timeline": { type: "timeline", state: {} },
        "default-animationGraph": { type: "animationGraph", state: {} },
        "default-properties": { type: "properties", state: {} },
        "default-modifiers": { type: "modifiers", state: {} },
        "default-viewport": { type: "viewport", state: {} }
    };
    let layout: PaneLayout = {
        type: "split",
        direction: SplitDirection.LeftToRight,
        firstSize: 300,
        first: {
            type: "split",
            direction: SplitDirection.BottomToTop,
            firstSize: 500,
            first: { type: "tab", tabs: ["default-files", "default-project"], selected: "default-files" },
            second: { type: "tab", tabs: ["default-outliner"], selected: "default-outliner" }
        },
        second: {
            type: "split",
            direction: SplitDirection.BottomToTop,
            firstSize: 300,
            first: { type: "tab", tabs: ["default-timeline", "default-animationGraph"], selected: "default-timeline" },
            second: {
                type: "split",
                direction: SplitDirection.RightToLeft,
                firstSize: 300,
                first: { type: "tab", tabs: ["default-properties", "default-modifiers"], selected: "default-properties" },
                second: { type: "tab", tabs: ["default-viewport"], selected: "default-viewport" }
            }
        }
    };
</script>

<div class="app">
    <div class="content">
        <TopBar />
        <PaneHost {layout} {states} component={type => {
            if (type == "properties") return PropertiesPane;
            if (type == "timeline") return TimelinePane;
            if (type == "outliner") return OutlinerPane;
            if (type == "viewport") return ViewportPane;
            if (type == "animationGraph") return AnimationGraphPane;
            return EmptyPane;
        }} on:layoutupdate={e => layout = e.detail} />
        <MediaBar />
    </div>
    <PopupHost />
    <MenuHost />
</div>

<style lang="scss">
    .app {
        position: relative;
        width: 100%;
        height: 100%;

        .content {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
    }
</style>