import { type ComponentChildren, type ComponentType, render } from "preact";
import { TextLabel } from "./label.tsx";
import { FrontLayerProvider } from "./front-layer.tsx";
import { cx } from "./utils.ts";
import { Menu, OpenDirection } from "./menu.tsx";
import { type Editor, EditorMenuBar, EditorProvider, EditorQuickActionBar } from "./editor.tsx";
import { Workspace, WorkspacePlaceholder, WorkspaceView } from "./workspace.tsx";
import { ViewportPanel } from "./viewport-panel.tsx";
import { ProjectPanel } from "./project-panel.tsx";
import { WebGPUCheckGuard } from "./gpu-check-guard.tsx";
import { loadLanguages } from "./translation.tsx";
import { AboutMotionPanel, AboutNaharaPanel } from "./about-panel.tsx";
import "./app.css";
import { PropertiesPanel } from "./properties-panel.tsx";
import { useState } from "preact/hooks";
import { HistoryPanel } from "./history-panel.tsx";

export function runApp(editor: Editor): void {
    render(
        <App editor={editor} />,
        document.querySelector("#app")!,
    );
}

const panels: Record<
    string,
    (data: unknown, setData: (updater: (data: unknown) => unknown) => void) => ComponentChildren
> = {
    viewport: () => <ViewportPanel />,
    project: () => <ProjectPanel />,
    properties: () => <PropertiesPanel />,
    history: () => <HistoryPanel />,
    aboutMotion: () => <AboutMotionPanel />,
    aboutNahara: () => <AboutNaharaPanel />,
};

const languages = await loadLanguages("en-us");

const App: ComponentType<{ editor: Editor }> = ({ editor }) => {
    const [workspace, setWorkspace] = useState(Workspace.Default);

    return (
        <WebGPUCheckGuard>
            <EditorProvider editor={editor} languages={languages}>
                <FrontLayerProvider>
                    <header>
                        <div class={cx("group", "left")}>
                            <EditorMenuBar />
                        </div>
                        <div class={cx("group", "right")}>
                            <Menu label={<TextLabel>Default</TextLabel>} dirOverride={OpenDirection.Down.Left}></Menu>
                        </div>
                    </header>
                    <main>
                        <WorkspaceView
                            workspace={workspace}
                            onChange={setWorkspace}
                            content={({ panelType, data }, setData) => {
                                const panel = panels[panelType];
                                if (panel == null) return <WorkspacePlaceholder />;
                                return panel(data, setData);
                            }}
                        />
                    </main>
                    <footer>
                        <div className="group center">
                            <EditorQuickActionBar />
                        </div>
                    </footer>
                </FrontLayerProvider>
            </EditorProvider>
        </WebGPUCheckGuard>
    );
};
