<script lang="ts">
    import { onMount } from "svelte";
    import { app } from "../../appglobal";
    import { objects, type IAnimatable, type IObjectContainer, type IScene, type ISceneContainerObject, type ISceneObjectWithPositionalData, type ISceneObjectWithSizeData, type ISceneObjectWithViewportEditing, type SceneObjectInfo } from "@nahara/motion";
    import { buildViewportSceneTree, calculateViewportButtonGeometries, findObjectFromPoint, getAbsoluteInViewport, type ViewportSceneObject, type ViewportSceneTree } from "./sceneutils";
    import { openMenuAt } from "../menu/MenuHost.svelte";
    import type { DropdownEntry } from "../menu/FancyMenu";

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    $: {
        ctx = canvas?.getContext("2d")!;
        render();
    }

    const currentScene = app.currentSceneStore;
    const currentSelection = app.currentSelectionStore;
    const seekhead = app.currentSeekheadStore;

    let sceneTree: ViewportSceneTree | undefined = undefined;

    // TODO handle playback
    // TODO replace the current viewport object editing impl with better one, preferrably a flatten approach.
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
        console.log("render");
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
        renderSelectionBox(sceneViewportScale);
    }

    function renderSelectionBox(vpScale: number) {
        if (!($currentSelection && sceneTree)) return;
        const geom = getAbsoluteInViewport(sceneTree.all.get($currentSelection.primary)!, $seekhead.position);
        const rectangles = calculateViewportButtonGeometries(geom, vpScale);
        if (!rectangles) return;

        for (const rect of rectangles) {
            switch (rect.drawMode) {
                case "filled":
                    ctx.strokeStyle = "#000000";
                    ctx.fillStyle = "#ffffff";
                    ctx.strokeRect(rect.geometry.position.x, rect.geometry.position.y, rect.geometry.size.x, rect.geometry.size.y);
                    ctx.fillRect(rect.geometry.position.x, rect.geometry.position.y, rect.geometry.size.x, rect.geometry.size.y);
                    continue;
                case "border":
                    ctx.strokeStyle = "#000000";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(rect.geometry.position.x, rect.geometry.position.y, rect.geometry.size.x, rect.geometry.size.y);
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(rect.geometry.position.x, rect.geometry.position.y, rect.geometry.size.x, rect.geometry.size.y);
                    continue;
                default:
                    continue;
            }
        }
    }

    // Mouse events
    let clickingCanvas = false;
    let clickingObject: SceneObjectInfo | undefined = undefined;
    let clickingViewportButton: (ReturnType<typeof calculateViewportButtonGeometries> & {})[number] | undefined = undefined;
    let adjustedClickingObject = false;

    function mapMousePositionFromEvent(e: MouseEvent, scene: IScene) {
        const sceneWidth = scene.metadata.size.x;
        const sceneHeight = scene.metadata.size.y;
        const sceneRatio = sceneWidth / sceneHeight;
        const viewportRatio = canvas.width / canvas.height;
        const vpScale = sceneRatio > viewportRatio ? canvas.width / sceneWidth : canvas.height / sceneHeight;
        const sx = (e.offsetX * devicePixelRatio - (canvas.width - sceneWidth * vpScale) / 2) / vpScale;
        const sy = (e.offsetY * devicePixelRatio - (canvas.height - sceneHeight * vpScale) / 2) / vpScale;
        const sdx = e.movementX * devicePixelRatio / vpScale;
        const sdy = e.movementY * devicePixelRatio / vpScale;

        return {
            sx, sy, sdx, sdy, vpScale
        };
    }

    function handleCanvasMouseDown(e: MouseEvent) {
        clickingCanvas = true;
        clickingObject = undefined;
        clickingViewportButton = undefined;
        adjustedClickingObject = false;

        if (!$currentScene) return;
        const { sx, sy, vpScale } = mapMousePositionFromEvent(e, $currentScene);

        if ($currentSelection) {
            const primaryGeom = getAbsoluteInViewport(sceneTree!.all.get($currentSelection.primary)!, $seekhead.position);
            const buttons = calculateViewportButtonGeometries(primaryGeom, vpScale)?.filter(b => !!b.inputMatrix).reverse();

            if (buttons) for (const button of buttons) {
                const bx = button.geometry.position.x / vpScale;
                const by = button.geometry.position.y / vpScale;
                const bw = button.geometry.size.x / vpScale;
                const bh = button.geometry.size.y / vpScale;

                if (sx >= bx && sy >= by && sx < bx + bw && sy < by + bh) {
                    clickingObject = $currentSelection.primary;
                    clickingViewportButton = button;
                    return;
                }
            }

            // Clicked none of the object's button
        }

        const clicked = findObjectFromPoint(sx, sy, $seekhead.position, sceneTree!.root);

        if (clicked) {
            clickingObject = clicked.scene;
            if (e.shiftKey || e.ctrlKey) app.selectMulti(clicked.scene, false);
            else app.selectSingle(clicked.scene);
        } else {
            app.deselectAll();
        }
    }

    function handleCanvasMouseMove(e: MouseEvent) {
        if (!clickingCanvas) return;

        if (!$currentScene) return;
        const { sdx, sdy } = mapMousePositionFromEvent(e, $currentScene);

        if (clickingObject && clickingViewportButton) {
            function applyInput<T>(animatable: IAnimatable<T>, adjustment: (prev: T, x: number, y: number) => T) {
                const current = animatable.get($seekhead.position);
                const next = adjustment(current, sdx, sdy);
                if (animatable.animated) animatable.set($seekhead.position, next);
                else animatable.defaultValue = next;
            }

            const inputMatrix = clickingViewportButton.inputMatrix!;

            if ((clickingObject.object as ISceneObjectWithPositionalData).isPositional) {
                const { x, y } = clickingObject.object as ISceneObjectWithPositionalData;
                applyInput(x, (prev, dx, dy) => prev + dx * inputMatrix.position.x);
                applyInput(y, (prev, dx, dy) => prev + dy * inputMatrix.position.y);
            }
            
            if ((clickingObject.object as ISceneObjectWithSizeData).isSizable) {
                const { width, height } = clickingObject.object as ISceneObjectWithSizeData;
                applyInput(width, (prev, dx, dy) => prev + dx * inputMatrix.size.x);
                applyInput(height, (prev, dx, dy) => prev + dy * inputMatrix.size.y);
            }

            adjustedClickingObject = true;
            currentScene.update(a => a);
        }
    }

    function handleCanvasMouseUp(e: MouseEvent) {
        if (!clickingCanvas) return;
        clickingCanvas = false;

        if (!$currentScene) return;
        const { sx, sy } = mapMousePositionFromEvent(e, $currentScene);

        // Just click
        if (clickingObject && !adjustedClickingObject) {
            const subtree = sceneTree!.all.get(clickingObject)?.children ?? sceneTree!.root;
            const offset = subtree == sceneTree!.root
                ? { x: 0, y: 0 }
                : getAbsoluteInViewport(sceneTree!.all.get(clickingObject)!, $seekhead.position)?.position
                ?? { x: 0, y: 0 };
            const clicked = findObjectFromPoint(
                sx - offset.x, sy - offset.y,
                $seekhead.position,
                subtree
            );

            if (clicked) {
                clickingObject = clicked.scene;
                if (e.shiftKey || e.ctrlKey) app.selectMulti(clicked.scene, false);
                else app.selectSingle(clicked.scene);
            }
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
                    const posOffset = toContainer == $currentScene
                        ? { x: 0, y: 0 }
                        : getAbsoluteInViewport(sceneTree!.all.get($currentSelection!.primary)!, $seekhead.position)?.position
                        ?? { x: 0, y: 0 }

                    if ((obj.object as ISceneObjectWithPositionalData).isPositional) {
                        const v = { x: sx - posOffset.x, y: sy - posOffset.y };
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

<style lang="scss">
    canvas {
        width: 100%;
        height: 100%;
    }
</style>