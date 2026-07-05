<script lang="ts">
    import { of, switchMap } from "rxjs";
    import Button from "./component/Button.svelte";
    import IconLabel from "./component/IconLabel.svelte";
    import KeybindLabel from "./component/KeybindLabel.svelte";
    import MenuBar from "./component/MenuBar.svelte";
    import TextLabel from "./component/TextLabel.svelte";
    import TimeDisplay from "./component/TimeDisplay.svelte";
    import Toolbar from "./component/Toolbar.svelte";
    import Workspace from "./component/Workspace.svelte";
    import { getEditorSession, ProjectSession } from "./editor";
    import { RootFolder } from "./files";
    import PanelLabel from "./panel/PanelLabel.svelte";
    import { defaultPanelStates, type PanelMap, type PanelState } from "./panel/panels";
    import PanelSwitch from "./panel/PanelSwitch.svelte";
    import type { WorkspaceState } from "./workspace";
    import { timing } from "@nahara/motion";
    import type { Settings } from "./settings";
    import AboutMotionDialog from "./dialog/AboutMotionDialog.svelte";
    import MenuSeparator from "./component/MenuSeparator.svelte";
    import SimpleMenu from "./component/SimpleMenu.svelte";
    import KeyCombinationName from "./component/KeyCombinationName.svelte";
    import Popover from "./component/Popover.svelte";
    import Translation from "./util/Translation.svelte";
    import { setLanguage, type Language } from "./i18n";

    let aboutMotionDialog = $state(false);

    const editor = getEditorSession();
    const project = editor.project;
    const settings = editor.settings;
    const keybind = editor.keybind;
    const sceneSession = project.pipe(switchMap((project) => project?.scene ?? of(null)));
    const scene = sceneSession.pipe(switchMap((scene) => scene?.scene$ ?? of(null)));
    const saved = sceneSession.pipe(switchMap((scene) => scene?.saved$ ?? of(true)));
    const undoStack = sceneSession.pipe(switchMap((scene) => scene?.undoStack$ ?? of([])));
    const redoStack = sceneSession.pipe(switchMap((scene) => scene?.redoStack$ ?? of([])));
    const playbackState = sceneSession.pipe(switchMap((scene) => scene?.state$ ?? of(null)));
    const seekheadPosition = sceneSession.pipe(switchMap((scene) => scene?.seekhead$ ?? of(0)));
    const workspace = editor.workspace;

    const negTime = $derived($seekheadPosition < 0);
    const totalSec = $derived(Math.floor(Math.abs($seekheadPosition) / timing.TICKS_PER_SECOND));
    const [nibbleName, nibble] = $derived(getNibbleDisplay(Math.abs($seekheadPosition)));
    const sec = $derived((totalSec % 60).toString().padStart(2, "0"));
    const min = $derived((Math.floor(totalSec / 60) % 60).toString().padStart(2, "0"));
    const hrs = $derived((Math.floor(totalSec / 3600) % 60).toString().padStart(2, "0"));

    setLanguage(() => {
        if ($settings.general.language == "auto") return navigator.language as Language;
        else return $settings.general.language;
    });

    function getNibbleDisplay(tick: number): [label: string, value: string] {
        const style = $settings.general.clockStyle;

        switch (style) {
            case "ms": {
                const ms = Math.floor(((tick % timing.TICKS_PER_SECOND) * 1000) / timing.TICKS_PER_SECOND);
                return ["MS", ms.toString().padStart(3, "0")];
            }
            case "frame": {
                const fps = $scene?.graphics.fps ?? null;
                if (fps == null) return ["FRAME", "00/00"];
                const frame = Math.floor((tick * fps) / timing.TICKS_PER_SECOND) % fps;
                const digits = Math.ceil(Math.log10(fps));
                return ["FRAME", `${frame.toString().padStart(digits, "0")}/${fps}`];
            }
            case "tick": {
                return ["TICK", (tick % timing.TICKS_PER_SECOND).toString().padStart(6, "0")];
            }
            default:
                return [(style as string).toUpperCase(), "???"];
        }
    }

    async function openProject() {
        const handle = await showDirectoryPicker({ id: "nahara-motion-project", mode: "readwrite" });
        const root = RootFolder.createRoot(handle);
        const project = new ProjectSession(root);
        editor.project.next(project);
    }

    function closeProject() {}

    async function saveScene() {
        if ($sceneSession == null) return;
        const scene = $sceneSession;
        await scene.saveScene();
    }

    function saveSceneAs() {}
    function closeScene() {}

    function undo() {
        if ($sceneSession == null || $undoStack.length == 0) return;
        const session = $sceneSession;
        const entry = $undoStack[$undoStack.length - 1];
        session.revertScene(entry);
    }

    function redo() {
        if ($sceneSession == null || $redoStack.length == 0) return;
        const session = $sceneSession;
        const entry = $redoStack[0];
        session.revertScene(entry);
    }

    function cut() {}
    function copy() {}
    function paste() {}

    function playPause() {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        const state = $sceneSession.state;
        session.state = state == "playing" ? "paused" : "playing";
    }

    function playStop() {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        const state = $sceneSession.state;

        if (state == "playing") {
            session.stop();
        } else {
            session.state = "playing";
        }
    }

    function seekToPreviousFrame() {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        const fps = $sceneSession.scene.graphics.fps;
        session.seekhead -= timing.TICKS_PER_SECOND / fps;
    }

    function seekToNextFrame() {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        const fps = $sceneSession.scene.graphics.fps;
        session.seekhead += timing.TICKS_PER_SECOND / fps;
    }

    function seekToPreviousMarker() {}
    function seekToNextMarker() {}

    function seekToStart() {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        session.seekhead = $sceneSession.scene.timeline.startTick;
    }

    function seekToEnd() {
        if ($sceneSession == null) return;
        const session = $sceneSession;
        session.seekhead = $sceneSession.scene.timeline.endTick;
    }

    function openNewWindow(content: PanelState) {
        const windowId = crypto.randomUUID();
        const tabId = crypto.randomUUID();

        onWorkspaceChange((state) => ({
            ...state,
            floating: [
                ...state.floating,
                {
                    id: windowId,
                    x: 100,
                    y: 100,
                    width: 800,
                    height: 600,
                    selectedId: tabId,
                    tabs: [{ tabId, content }],
                },
            ],
        }));
    }

    function exportWorkspaceJson() {
        const blob = new Blob([JSON.stringify(editor.workspace.value)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "workspace.json";
        link.click();
        URL.revokeObjectURL(link.href);
    }

    async function exportWorkspaceClipboard() {
        const json = JSON.stringify(editor.workspace.value);
        await navigator.clipboard.writeText(json);
    }

    async function importWorkspaceClipboard() {
        const json = await navigator.clipboard.readText();
        const state = JSON.parse(json);
        // TODO: Validate workspace
        editor.workspace.next(state);
    }

    function userManual() {}

    function onWorkspaceChange(updater: (state: WorkspaceState<PanelState>) => WorkspaceState<PanelState>) {
        editor.workspace.next(updater(editor.workspace.value));
    }

    function cycleClockNibbleType() {
        const allTypes: Settings["general"]["clockStyle"][] = ["ms", "frame", "tick"];
        const type = $settings.general.clockStyle;

        editor.settings.next({
            ...editor.settings.value,
            general: {
                ...editor.settings.value.general,
                clockStyle: allTypes[(allTypes.indexOf(type) + 1) % 3],
            },
        });
    }
</script>

<svelte:head>
    {#if $sceneSession != null && $project != null}
        <title>{$saved ? "" : "\u2022 "}{$sceneSession.name} | {$project.name} | Nahara's Motion</title>
    {:else if $project != null}
        <title>{$project.name} | Nahara's Motion</title>
    {:else}
        <title>Nahara's Motion</title>
    {/if}
</svelte:head>

<div class="app">
    <header>
        <div class="group start">
            <MenuBar>
                <SimpleMenu name={{ translated: "file" }}>
                    <SimpleMenu
                        name={{ translated: "file.openProject" }}
                        onClick={openProject}
                        keys={$keybind.file.openProject}
                    />
                    <SimpleMenu name={{ translated: "file.recentProjects" }} trailingIcon="drop-right">
                        <SimpleMenu name="(no recent projects)" enabled={false} />
                    </SimpleMenu>
                    <MenuSeparator />
                    <SimpleMenu
                        name={{ translated: "file.saveScene" }}
                        enabled={$sceneSession != null}
                        onClick={saveScene}
                        keys={$keybind.file.saveScene}
                    />
                    <SimpleMenu
                        name={{ translated: "file.saveSceneAs" }}
                        enabled={$sceneSession != null}
                        onClick={saveSceneAs}
                        keys={$keybind.file.saveSceneAs}
                    />
                    <MenuSeparator />
                    <SimpleMenu
                        name={{ translated: "file.closeScene" }}
                        enabled={$sceneSession != null}
                        onClick={closeScene}
                        keys={$keybind.file.closeScene}
                    />
                    <SimpleMenu
                        name={{ translated: "file.closeProject" }}
                        enabled={$project != null}
                        onClick={closeProject}
                        keys={$keybind.file.closeProject}
                    />
                </SimpleMenu>
                <SimpleMenu name={{ translated: "edit" }}>
                    <SimpleMenu
                        name={{ translated: "edit.undo" }}
                        enabled={$undoStack.length > 0}
                        onClick={undo}
                        keys={$keybind.edit.undo}
                    />
                    <SimpleMenu
                        name={{ translated: "edit.redo" }}
                        enabled={$redoStack.length > 0}
                        onClick={redo}
                        keys={$keybind.edit.redo}
                    />
                    <MenuSeparator />
                    <SimpleMenu
                        name={{ translated: "edit.cut" }}
                        enabled={$sceneSession != null}
                        onClick={cut}
                        keys={$keybind.edit.cut}
                    />
                    <SimpleMenu
                        name={{ translated: "edit.copy" }}
                        enabled={$sceneSession != null}
                        onClick={copy}
                        keys={$keybind.edit.copy}
                    />
                    <SimpleMenu
                        name={{ translated: "edit.paste" }}
                        enabled={$sceneSession != null}
                        onClick={paste}
                        keys={$keybind.edit.paste}
                    />
                </SimpleMenu>
                <SimpleMenu name={{ translated: "playback" }}>
                    <SimpleMenu
                        name={{ translated: "playback.playPause" }}
                        enabled={$playbackState != null}
                        onClick={playPause}
                        keys={$keybind.playback.playPause}
                    />
                    <SimpleMenu
                        name={{ translated: "playback.playStop" }}
                        enabled={$playbackState != null}
                        onClick={playStop}
                        keys={$keybind.playback.playStop}
                    />
                    <MenuSeparator />
                    <SimpleMenu
                        name={{ translated: "playback.seekToStart" }}
                        enabled={$playbackState != null}
                        onClick={seekToStart}
                        keys={$keybind.playback.seekToStart}
                    />
                    <SimpleMenu
                        name={{ translated: "playback.seekToEnd" }}
                        enabled={$playbackState != null}
                        onClick={seekToEnd}
                        keys={$keybind.playback.seekToEnd}
                    />
                    <MenuSeparator />
                    <SimpleMenu
                        name={{ translated: "playback.seekToPrevFrame" }}
                        enabled={$playbackState != null}
                        onClick={seekToPreviousFrame}
                        keys={$keybind.playback.seekToPrevFrame}
                    />
                    <SimpleMenu
                        name={{ translated: "playback.seekToNextFrame" }}
                        enabled={$playbackState != null}
                        onClick={seekToNextFrame}
                        keys={$keybind.playback.seekToNextFrame}
                    />
                    <MenuSeparator />
                    <SimpleMenu
                        name={{ translated: "playback.seekToPrevMarker" }}
                        enabled={$playbackState != null}
                        onClick={seekToPreviousMarker}
                        keys={$keybind.playback.seekToPrevMarker}
                    />
                    <SimpleMenu
                        name={{ translated: "playback.seekToNextMarker" }}
                        enabled={$playbackState != null}
                        onClick={seekToNextMarker}
                        keys={$keybind.playback.seekToNextMarker}
                    />
                </SimpleMenu>
                <SimpleMenu name={{ translated: "window" }}>
                    {#each Object.keys(defaultPanelStates) as (keyof PanelMap)[] as type (type)}
                        <SimpleMenu
                            name={{ translated: `window.${type}` }}
                            onClick={() => openNewWindow(defaultPanelStates[type])}
                            keys={$keybind.window[type]}
                        />
                    {/each}
                </SimpleMenu>
                <SimpleMenu name={{ translated: "help" }}>
                    <SimpleMenu
                        name={{ translated: "help.userManual" }}
                        onClick={userManual}
                        keys={$keybind.help.userManual}
                    />
                    <SimpleMenu
                        name={{ translated: "help.aboutMotion" }}
                        onClick={() => (aboutMotionDialog = true)}
                        keys={$keybind.help.aboutMotion}
                    />
                </SimpleMenu>
            </MenuBar>
        </div>
        <div class="group center">
            <Toolbar>
                <Button style="toolbar">
                    {#if $sceneSession != null && $project != null}
                        <TextLabel>
                            {$saved ? "" : "(Unsaved)"}
                            {$sceneSession.name}
                            {"\u2022"}
                            {$project.name}
                            {"\u2022"}
                            <Translation key="general.appName" />
                        </TextLabel>
                    {:else if $project != null}
                        <TextLabel>
                            {$project.name}
                            {"\u2022"}
                            <Translation key="general.appName" />
                        </TextLabel>
                    {:else}
                        <TextLabel>
                            <Translation key="general.appName" />
                        </TextLabel>
                    {/if}
                </Button>
            </Toolbar>
        </div>
        <div class="group end">
            <MenuBar>
                <SimpleMenu name={{ translated: "workspace" }} trailingIcon="drop-down">
                    <SimpleMenu name="Export current layout" trailingIcon="drop-right">
                        <SimpleMenu
                            name="Export as JSON"
                            onClick={exportWorkspaceJson}
                            keys={$keybind.workspace.exportJson}
                        />
                        <SimpleMenu
                            name="Export to clipboard"
                            onClick={exportWorkspaceClipboard}
                            keys={$keybind.workspace.exportClipboard}
                        />
                    </SimpleMenu>
                    <SimpleMenu name="Import layout" trailingIcon="drop-right">
                        <SimpleMenu
                            name="Import from clipboard"
                            onClick={importWorkspaceClipboard}
                            keys={$keybind.workspace.importClipboard}
                        />
                    </SimpleMenu>
                </SimpleMenu>
            </MenuBar>
        </div>
    </header>
    <main>
        <Workspace workspace={$workspace} {onWorkspaceChange}>
            {#snippet panelLabel(state)}
                <PanelLabel {state} />
            {/snippet}
            {#snippet panel(state, onStateChange)}
                <PanelSwitch {state} {onStateChange} />
            {/snippet}
        </Workspace>
    </main>
    <footer>
        <div class="group start">
            <MenuBar>
                <SimpleMenu name="Playback controls" trailingIcon="drop-up" />
            </MenuBar>
        </div>
        <div class="group center">
            <Toolbar>
                <Button onClick={seekToPreviousMarker} enabled={$sceneSession != null}>
                    <TextLabel>P. Marker</TextLabel>
                    {#each $keybind.playback.seekToPrevMarker as key}
                        <KeybindLabel>
                            <KeyCombinationName {key} />
                        </KeybindLabel>
                    {/each}
                </Button>
                <Button onClick={seekToPreviousFrame} enabled={$sceneSession != null}>
                    <TextLabel>P. Frame</TextLabel>
                    {#each $keybind.playback.seekToPrevFrame as key}
                        <KeybindLabel>
                            <KeyCombinationName {key} />
                        </KeybindLabel>
                    {/each}
                </Button>
                <Button onClick={playPause} enabled={$playbackState != null}>
                    <TextLabel>{$playbackState == "playing" ? "Pause" : "Play"}</TextLabel>
                    {#each $keybind.playback.playPause as key}
                        <KeybindLabel>
                            <KeyCombinationName {key} />
                        </KeybindLabel>
                    {/each}
                </Button>
                <Button onClick={seekToNextFrame} enabled={$sceneSession != null}>
                    <TextLabel>N. Frame</TextLabel>
                    {#each $keybind.playback.seekToNextFrame as key}
                        <KeybindLabel>
                            <KeyCombinationName {key} />
                        </KeybindLabel>
                    {/each}
                </Button>
                <Button onClick={seekToNextMarker} enabled={$sceneSession != null}>
                    <TextLabel>N. Marker</TextLabel>
                    {#each $keybind.playback.seekToNextMarker as key}
                        <KeybindLabel>
                            <KeyCombinationName {key} />
                        </KeybindLabel>
                    {/each}
                </Button>
            </Toolbar>
        </div>
        <div class="group end">
            <TimeDisplay
                whole="{negTime ? '-' : ''}{hrs}:{min}:{sec}"
                {nibbleName}
                {nibble}
                onClick={cycleClockNibbleType}
            />
        </div>
    </footer>
</div>

<Popover dynamic={true} show={aboutMotionDialog} onDismiss={() => (aboutMotionDialog = false)}>
    <AboutMotionDialog onDismiss={() => (aboutMotionDialog = false)} />
</Popover>

<style>
    .app {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;

        > header,
        > footer {
            position: relative;
            height: 3rem;
            background-color: #efefef;

            > .group {
                position: absolute;
                height: 3rem;
                display: flex;
                flex-direction: row;

                &.start {
                    left: 0;
                }

                &.center {
                    left: 50%;
                    translate: -50%;
                }

                &.end {
                    right: 0;
                }
            }
        }

        > header {
            border-bottom: 1px solid #dfdfdf;
        }

        > footer {
            border-top: 1px solid #dfdfdf;
        }

        > main {
            height: 0;
            flex-grow: 1;
        }
    }
</style>
