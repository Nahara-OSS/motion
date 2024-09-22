# Tiling panes manager architecture
## What we want
- Tiling panes like tiling window manager
- Less cluttered UI (using lock toggle maybe?)

## Why we want
- Tiling is an efficient layout
- No need to rearrange windows (floating window manager is unironically easier to implement)

## Want we need (derived from "What we want")
- Layout definition
    - `PaneLayout`: Describe the current layout. Union type of `SplitLayout` and `TabLayout`.
    - `SplitLayout`: Split pane. The direction indicate the side of the layout with fixed size.
    - `TabLayout`: Pane with tabs. If there is no tabs, the pane is available for claiming. If there is a single tab, the pane renderer should display the title bar at full width.