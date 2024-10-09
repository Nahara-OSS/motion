<script lang="ts">
    import { onMount } from "svelte";
    import { app } from "../../appglobal";
    import { objects, type IObjectContainer, type IScene, type ISceneContainerObject, type ISceneObjectWithPositionalData, type ISceneObjectWithViewportEditSupport, type SceneObjectInfo, type Vec2, type ViewportEditHandle } from "@nahara/motion";
    import { buildViewportSceneTree, type ViewportSceneTree } from "./sceneutils";
    import { openMenuAt } from "../menu/MenuHost.svelte";
    import type { DropdownEntry } from "../menu/FancyMenu";
    import { openPopupAt } from "../popup/PopupHost.svelte";
    import ColorPickerPopup from "../popup/ColorPickerPopup.svelte";
    import type { EditorImpl } from "../../App.svelte";
    import Welcome from "./Welcome.svelte";

    export let state: any;
    export let editor: EditorImpl;
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    $: {
        ctx = canvas?.getContext("2d")!;
        render();
    }

    const currentProject = editor.projectStore;
    const currentScene = editor.sceneStore;
    const currentSelection = app.currentSelectionStore;
    const seekhead = app.currentSeekheadStore;

    let sceneTree: ViewportSceneTree | undefined = undefined;
    let lastTimestamp = 0;
    $: { sceneTree = $currentScene ? buildViewportSceneTree($currentScene) : undefined; render(); }
    $: { $currentSelection; render(); }
    $: { $seekhead; render(); }

    onMount(() => {
        let observer = new ResizeObserver(() => {
            // Force native resolution with this one trick!
            canvas.width = canvas.offsetWidth * devicePixelRatio;
            canvas.height = canvas.offsetHeight * devicePixelRatio;
            render();
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    });

    function render(timestamp = lastTimestamp) {
        if (!ctx) return;
        ctx.reset();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!$currentScene) {
            return;
        }

        // Letterboxing
        const sceneWidth = $currentScene.metadata.size.x;
        const sceneHeight = $currentScene.metadata.size.y;
        const sceneRatio = sceneWidth / sceneHeight;
        const viewportRatio = canvas.width / canvas.height;
        const sceneViewportScale = sceneRatio > viewportRatio ? canvas.width / sceneWidth : canvas.height / sceneHeight;

        ctx.translate(
            (canvas.width - sceneWidth * sceneViewportScale) / 2,
            (canvas.height - sceneHeight * sceneViewportScale) / 2
        );
        ctx.scale(sceneViewportScale, sceneViewportScale);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, $currentScene.metadata.size.x, $currentScene.metadata.size.y);

        if ($currentScene) {
            // Render the scene
            $currentScene?.renderFrame({
                canvas: ctx,
                containerSize: $currentScene.metadata.size,
                time: $seekhead.position,
                timeDelta: 0
            });

            // Render overlay
            ctx.resetTransform();
            ctx.translate(
                (canvas.width - sceneWidth * sceneViewportScale) / 2,
                (canvas.height - sceneHeight * sceneViewportScale) / 2
            );
            ctx.scale(sceneViewportScale, sceneViewportScale);
            renderSelectionBox(sceneViewportScale);
        }
    }

    function viewportSceneToObjectOf(
        object: SceneObjectInfo,
        parentMatrix: DOMMatrix = new DOMMatrix(),
        parentSize: Vec2 = $currentScene!.metadata.size
    ): { size: Vec2, matrix: DOMMatrix, parentSize: Vec2, parentMatrix: DOMMatrix } {
        const vpProxy = sceneTree!.all.get(object)!;

        if (vpProxy.parent) {
            const { matrix, size } = viewportSceneToObjectOf(vpProxy.parent.scene, parentMatrix, parentSize);
            parentMatrix = matrix;
            parentSize = size;
        }

        const { clickableSize, parentToThis } = (object.object as ISceneObjectWithViewportEditSupport<any>).getViewportEditorInfo($seekhead.position, parentSize);
        return {
            parentSize,
            parentMatrix,
            size: clickableSize,
            matrix: parentMatrix.multiply(parentToThis)
        };
    }

    function objectsUnderScenePos(
        sceneX: number, sceneY: number,
        scene: IObjectContainer = $currentScene!,
        filter: (object: SceneObjectInfo) => boolean = () => true
    ): SceneObjectInfo[] {
        let out: SceneObjectInfo[] = [];

        for (const object of scene) {
            if (!filter(object)) continue;
            if (!(object.object as ISceneObjectWithViewportEditSupport<any>).isViewportEditable) continue;
            if ($seekhead.position < object.timeStart || $seekhead.position >= object.timeEnd) continue;

            const { matrix, size } = viewportSceneToObjectOf(object);
            const { x, y } = matrix.inverse().transformPoint({ x: sceneX, y: sceneY, z: 0, w: 1 });
            const collide = x >= 0 && y >= 0 && x < size.x && y < size.y;
            if (collide) out.push(object);

            if ((object.object as ISceneContainerObject).isContainer) {
                out.push(...objectsUnderScenePos(sceneX, sceneY, object.object as ISceneContainerObject, filter));
            }
        }

        return out;
    }

    let adjustingObjectHandle: ViewportEditHandle | undefined = undefined;

    function renderSelectionBox(vpScale: number) {
        if (!($currentSelection && $currentScene && sceneTree)) return;
        let rendered: SceneObjectInfo[] = [];

        for (const selected of $currentSelection.multiple) {
            if ((selected.object as ISceneObjectWithViewportEditSupport<any>).isViewportEditable) {
                const data = selected.object as ISceneObjectWithViewportEditSupport<any>;
                const { parentMatrix, parentSize } = viewportSceneToObjectOf(selected);
                const parent = ctx.getTransform();
                ctx.setTransform(parent.multiply(parentMatrix));
                if (selected != $currentSelection.primary) ctx.globalAlpha = 0.5;
                data.renderBlueprint({
                    canvas: ctx,
                    containerSize: parentSize,
                    time: $seekhead.position,
                    timeDelta: 0
                }, selected.color, vpScale);
                ctx.setTransform(parent);
                ctx.globalAlpha = 1;
                rendered.push(selected);
            }
        }

        if (($currentSelection.primary.object as ISceneObjectWithViewportEditSupport<any>).isViewportEditable) {
            const data = $currentSelection.primary.object as ISceneObjectWithViewportEditSupport<any>;
            const { clickableSize, handles } = data.getViewportEditorInfo($seekhead.position, $currentScene.metadata.size);

            const parent = ctx.getTransform();
            const sceneToObject = viewportSceneToObjectOf($currentSelection.primary).matrix;
            ctx.setTransform(parent.multiply(sceneToObject));
            ctx.globalAlpha = !adjustingObjectHandle ? 1 : 0.5;
            ctx.scale(1 / vpScale, 1 / vpScale);
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 4;
            ctx.strokeRect(-5, -5, clickableSize.x * vpScale + 10, clickableSize.y * vpScale + 10);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.strokeRect(-5, -5, clickableSize.x * vpScale + 10, clickableSize.y * vpScale + 10);
            ctx.globalAlpha = 1;
            
            for (const handle of handles) {
                ctx.globalAlpha = !adjustingObjectHandle || adjustingObjectHandle?.uid == handle.uid ? 1 : 0.5;
                ctx.translate(handle.offsetX * vpScale, handle.offsetY * vpScale);
                ctx.fillStyle = "#fff";
                ctx.fillRect(-8, -8, 16, 16);
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 4;
                ctx.strokeRect(-8, -8, 16, 16);
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                ctx.strokeRect(-8, -8, 16, 16);
                ctx.translate(-handle.offsetX * vpScale, -handle.offsetY * vpScale);
                ctx.globalAlpha = 1;
            }

            ctx.scale(vpScale, vpScale);
            ctx.setTransform(parent);
        }
    }

    // Mouse events
    let clickingCanvas = false;
    let clickingObject: SceneObjectInfo | undefined = undefined;
    let adjustingObject: SceneObjectInfo | undefined = undefined;
    let adjustingObjectData: ISceneObjectWithViewportEditSupport<any> | undefined = undefined;
    let adjustingObjectMouseData: any = undefined;
    let adjustingObjectMatrix: DOMMatrix | undefined = undefined;
    let adjustInitialSceneX = 0, adjustInitialSceneY = 0;
    let adjusted = false;

    function mapMousePositionFromEvent(e: MouseEvent, scene: IScene) {
        const { left, top } = canvas.getBoundingClientRect();
        const sceneWidth = scene.metadata.size.x;
        const sceneHeight = scene.metadata.size.y;
        const sceneRatio = sceneWidth / sceneHeight;
        const viewportRatio = canvas.width / canvas.height;
        const vpScale = sceneRatio > viewportRatio ? canvas.width / sceneWidth : canvas.height / sceneHeight;
        const sx = ((e.clientX - left) * devicePixelRatio - (canvas.width - sceneWidth * vpScale) / 2) / vpScale;
        const sy = ((e.clientY - top) * devicePixelRatio - (canvas.height - sceneHeight * vpScale) / 2) / vpScale;
        const sdx = e.movementX * devicePixelRatio / vpScale;
        const sdy = e.movementY * devicePixelRatio / vpScale;

        return {
            sx, sy, sdx, sdy, vpScale
        };
    }

    function handleCanvasMouseDown(e: MouseEvent) {
        clickingCanvas = true;
        clickingObject = undefined;
        adjusted = false;
        if (!$currentScene || !sceneTree) return;
        const { sx, sy, vpScale } = mapMousePositionFromEvent(e, $currentScene);

        if ($currentSelection) {
            if (($currentSelection.primary.object as ISceneObjectWithViewportEditSupport<any>).isViewportEditable) {
                const primaryGeom = viewportSceneToObjectOf($currentSelection.primary);
                const pointInObj = primaryGeom.matrix.inverse().transformPoint({ x: sx, y: sy });
                const collided = pointInObj.x >= -10 &&
                    pointInObj.y >= -10 &&
                    pointInObj.x <= primaryGeom.size.x + 20 &&
                    pointInObj.y <= primaryGeom.size.y + 20;

                if (!collided) {    
                    const objects = objectsUnderScenePos(sx, sy);
                    const toSelect = objects[objects.length - 1];
                    if (toSelect) (e.shiftKey ? app.selectMulti : app.selectSingle)(toSelect);
                    else if (!e.shiftKey) app.deselectAll();
                    clickingCanvas = false;
                    return;
                }

                const obj = $currentSelection.primary.object as ISceneObjectWithViewportEditSupport<any>;
                adjustingObject = $currentSelection.primary;
                adjustingObjectData = obj;
                adjustInitialSceneX = sx;
                adjustInitialSceneY = sy;

                if (obj.viewportEditMouseDown) {
                    const info = obj.getViewportEditorInfo($seekhead.position, $currentScene.metadata.size);
                    adjustingObjectMatrix = viewportSceneToObjectOf(adjustingObject).matrix;
                    const localObjectXY = adjustingObjectMatrix.inverse().transformPoint({ x: sx, y: sy, z: 0, w: 1 });
                    
                    adjustingObjectHandle = undefined;
                    for (const handle of info.handles) {
                        const handleSize = 8 / vpScale;

                        if (localObjectXY.x >= handle.offsetX - handleSize &&
                            localObjectXY.y >= handle.offsetY - handleSize &&
                            localObjectXY.x <= handle.offsetX + handleSize &&
                            localObjectXY.y <= handle.offsetY + handleSize
                        ) {
                            adjustingObjectHandle = handle;
                            break;
                        }
                    }

                    adjustingObjectMouseData = obj.viewportEditMouseDown({
                        time: $seekhead.position,
                        sceneX: sx,
                        sceneY: sy,
                        localObjectX: localObjectXY.x,
                        localObjectY: localObjectXY.y,
                        parentObjectLocalX: sx,
                        parentObjectLocalY: sy,
                        clickedHandle: adjustingObjectHandle
                    });
                }

                currentScene.update(a => a);
            }
        } else {
            const objects = objectsUnderScenePos(sx, sy);
            const toSelect = objects[objects.length - 1];
            if (toSelect) (e.shiftKey ? app.selectMulti : app.selectSingle)(toSelect);
            else if (!e.shiftKey) app.deselectAll();
        }
    }

    function handleCanvasMouseMove(e: MouseEvent) {
        if (!clickingCanvas) return;
        if (!$currentScene || !sceneTree) return;
        const { sx, sy } = mapMousePositionFromEvent(e, $currentScene);

        if (adjustingObject && adjustingObjectData && adjustingObjectMatrix) {
            adjusted = true;

            if (adjustingObjectData.viewportEditMouseMove) {
                const localObjectXY = adjustingObjectMatrix.inverse().transformPoint({ x: sx, y: sy, z: 0, w: 1 });
                adjustingObjectData.viewportEditMouseMove({
                    time: $seekhead.position,
                    sceneX: sx,
                    sceneY: sy,
                    localObjectX: localObjectXY.x,
                    localObjectY: localObjectXY.y,
                    parentObjectLocalX: sx,
                    parentObjectLocalY: sy,
                    clickedHandle: adjustingObjectHandle
                }, adjustingObjectMouseData);
            }

            currentScene.update(a => a);
        }
    }

    function handleCanvasMouseUp(e: MouseEvent) {
        if (!clickingCanvas) return;
        clickingCanvas = false;
        if (!$currentScene || !sceneTree) return;
        const { sx, sy } = mapMousePositionFromEvent(e, $currentScene);

        if (adjustingObject && adjustingObjectData && adjustingObjectMatrix) {
            if (adjustingObjectData.viewportEditMouseUp) {
                const localObjectXY = adjustingObjectMatrix.inverse().transformPoint({ x: sx, y: sy, z: 0, w: 1 });
                adjustingObjectData.viewportEditMouseUp({
                    time: $seekhead.position,
                    sceneX: sx,
                    sceneY: sy,
                    localObjectX: localObjectXY.x,
                    localObjectY: localObjectXY.y,
                    parentObjectLocalX: sx,
                    parentObjectLocalY: sy,
                    clickedHandle: adjustingObjectHandle
                }, adjustingObjectMouseData);
            }

            adjustingObject = undefined;
            adjustingObjectData = undefined;
            adjustingObjectMouseData = undefined;
            adjustingObjectHandle = undefined;
            currentScene.update(a => a);
        }

        if (!adjusted) {
            const objects = objectsUnderScenePos(sx, sy);
            const toSelect = objects[objects.length - 1];
            if (toSelect) (e.shiftKey ? app.selectMulti : app.selectSingle)(toSelect);
            else if (!e.shiftKey) app.deselectAll();
        }
    }

    function handleCanvasContextMenu(e: MouseEvent) {
        e.preventDefault();
        const root: DropdownEntry[] = [];

        if ($currentScene) {
            const { sx, sy } = mapMousePositionFromEvent(e, $currentScene);

            root.push({
                type: "tree",
                name: "Add",
                children: app.createAddObjectMenu(type => {
                    if (!$currentScene) return;
                    const obj = objects.createNew(type, $seekhead.position, $seekhead.position + 1000);
                    const toContainer = $currentSelection &&
                        ($currentSelection.primary.object as ISceneContainerObject).isContainer
                        ? $currentSelection.primary.object as ISceneContainerObject
                        : $currentScene;
                    let posInContainer: Vec2;

                    if (toContainer == $currentScene) {
                        posInContainer = { x: sx, y: sy };
                    } else {
                        const { matrix } = viewportSceneToObjectOf($currentSelection!.primary);
                        posInContainer = matrix.inverse().transformPoint({ x: sx, y: sy, z: 0, w: 1 });
                    }

                    if ((obj.object as ISceneObjectWithPositionalData).isPositional) {
                        const v = { x: posInContainer.x, y: posInContainer.y };
                        (obj.object as ISceneObjectWithPositionalData).x.defaultValue = v.x;
                        (obj.object as ISceneObjectWithPositionalData).y.defaultValue = v.y;
                    }

                    toContainer.add(obj);
                    currentScene.update(a => a);
                    if (e.shiftKey || e.ctrlKey) app.selectMulti(obj, false);
                    else app.selectSingle(obj);
                })
            });

            if ($currentSelection) root.push({
                type: "simple",
                name: "Change label color",
                click() {
                    const target = $currentSelection.primary;
                    openPopupAt(e.clientX, e.clientY, "Label color", ColorPickerPopup, {
                        initial: target.color,
                        callback(c: string) {
                            target.color = c;
                            currentScene.update(a => a);
                        }
                    });
                },
            }, {
                type: "simple",
                name: "Delete selection",
                click() {
                    function removeEntirelyFromContainer(objects: SceneObjectInfo[], container: IObjectContainer) {
                        for (const object of objects) {
                            const idx = container.indexOf(object);
                            if (idx != -1) container.remove(idx);
                        }

                        for (const object of container) {
                            if ((object.object as ISceneContainerObject).isContainer)
                                removeEntirelyFromContainer(objects, object.object as ISceneContainerObject);
                        }
                    }

                    removeEntirelyFromContainer($currentSelection.multiple, $currentScene);
                    app.deselectAll();
                    currentScene.update(a => a);
                },
            });
        }

        if (root.length > 0) openMenuAt(e.clientX, e.clientY, root);
    }
</script>

<svelte:body
    on:mousemove={handleCanvasMouseMove}
    on:mouseup={handleCanvasMouseUp}
/>

<canvas bind:this={canvas} on:mousedown={handleCanvasMouseDown} on:contextmenu={handleCanvasContextMenu}></canvas>
{#if !$currentProject}
    <div class="welcome-wrapper"><Welcome {editor} /></div>
{:else if !$currentScene}
    <div class="notice">Select a scene from Project explorer pane to edit</div>
{/if}

<style lang="scss">
    canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .notice {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 80%;
        translate: -50% -50%;
        text-align: center;
        color: #7f7f7f;
    }

    .welcome-wrapper {
        position: absolute;
        top: 50%;
        left: 0;
        width: 100%;
        translate: 0 -50%;
        padding: 32px;
        box-sizing: border-box;
    }
</style>