<script lang="ts">
    import { SimpleProject } from "@nahara/motion";
    import type { EditorImpl } from "../../App";

    export let editor: EditorImpl;

    interface QuickStartAction {
        icon: string;
        label: string;
        click?(e: MouseEvent): any;
    }

    const quickStartActions: QuickStartAction[] = [
        {
            icon: "wave",
            label: "Take a tour (Coming soon in distant future)"
        },
        {
            icon: "folder",
            label: "New or open existing project...",
            async click(e) {
                const handle = await showDirectoryPicker({ id: "project", mode: "readwrite" });
                const meta = await SimpleProject.probeProjectMeta(handle);

                if (!meta) {
                    // TODO show popup warning of project creation
                }

                const project = await SimpleProject.tryOpen(handle);
                editor.openProject(project);
            },
        }
    ];
</script>

<div class="welcome">
    <h1>Welcome</h1>
    <h2>Quick start</h2>
    <div class="quick-start">
        {#each quickStartActions as action}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="entry"
                role="button"
                tabindex="0"
                on:click={e => { if (action.click) action.click(e); }}
            >
                <div class="icon"></div>
                <div class="label">{action.label}</div>
            </div>
        {/each}
    </div>
    <h2>Recent</h2>
    <div class="recent">
        Not implemented
    </div>
</div>

<style lang="scss">
    .welcome {
        position: relative;
        color: #000;
        text-align: left;
    }

    h1 { font-size: 24px; font-weight: normal; margin: 12px 0; }
    h2 { font-size: 16px; font-weight: normal; margin: 8px 0; }

    .quick-start {
        .entry {
            width: fit-content;
            display: flex;
            flex-direction: row;
            height: 24px;
            border: 1px solid transparent;

            &:hover {
                background-color: #0000000f;
                border: 1px solid #1d1d1d;
            }

            .icon {
                width: 24px;
                height: 24px;
                background-color: #e0e0e0;
            }

            .label {
                padding: 5px;
            }
        }
    }
</style>