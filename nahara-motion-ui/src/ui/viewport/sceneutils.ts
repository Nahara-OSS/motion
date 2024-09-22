import { Scene, type IObjectContainer, type IScene, type ISceneContainerObject, type ISceneObjectWithPositionalData, type ISceneObjectWithSizeData, type ISceneObjectWithViewportEditing, type SceneObjectInfo, type Vec2 } from "@nahara/motion";

/**
 * Derived viewport info for scene object.
 */
export interface ViewportSceneObject {
    /**
     * The parent object that is containing this object. Unset if the object is at the root of the scene.
     */
    parent?: ViewportSceneObject;
    scene: SceneObjectInfo;

    /**
     * A collection of children. Only present if `scene` is a container.
     */
    children?: ViewportSceneObject[];
}

export interface ViewportSceneTree {
    root: ViewportSceneObject[];
    all: Map<SceneObjectInfo, ViewportSceneObject>;
}

export function buildViewportSceneSubtree(
    container: IObjectContainer,
    map: Map<SceneObjectInfo, ViewportSceneObject>,
    self?: ViewportSceneObject
): ViewportSceneObject[] {
    return [...container].map(object => {
        const out: ViewportSceneObject = {
            parent: self,
            scene: object
        };
        if ((object.object as ISceneContainerObject).isContainer)
            out.children = buildViewportSceneSubtree(object.object as ISceneContainerObject, map, out);
        map.set(object, out);
        return out;
    });
}

export function buildViewportSceneTree(scene: IScene): ViewportSceneTree {
    const map: Map<SceneObjectInfo, ViewportSceneObject> = new Map();
    return {
        root: buildViewportSceneSubtree(scene, map),
        all: map
    };
}

/**
 * Find the object from box intersection.
 * @param x The X coordinate.
 * @param y The Y coordinate.
 * @param root The root of scene tree.
 * @param filter A filter function that ignore the object if the returned value is `false`.
 */
export function findObjectFromPoint(
    x: number,
    y: number,
    currentTime: number,
    root: ViewportSceneObject[],
    filter: (x: ViewportSceneObject) => boolean = () => true,
    flip = true
): ViewportSceneObject | undefined {
    for (const object of (flip ? [...root].reverse() : root)) {
        const position = (object.scene.object as ISceneObjectWithPositionalData).isPositional
            ? {
                x: (object.scene.object as ISceneObjectWithPositionalData).x.get(currentTime),
                y: (object.scene.object as ISceneObjectWithPositionalData).y.get(currentTime)
            }
            : undefined;
        if (!position) continue;

        let clickedChild = object.children
            ? findObjectFromPoint(x - position.x, y - position.y, currentTime, object.children, filter, flip)
            : undefined;
        if (clickedChild) return clickedChild;

        const size = (object.scene.object as ISceneObjectWithSizeData).isSizable
            ? {
                x: (object.scene.object as ISceneObjectWithSizeData).width.get(currentTime),
                y: (object.scene.object as ISceneObjectWithSizeData).height.get(currentTime)
            }
            : undefined;

        if (!size) continue;
        if (filter(object) && x >= position.x && y >= position.y && x < position.x + size.x && y < position.y + size.y)
            return object;
    }
}

export function getAbsoluteInViewport(object: ViewportSceneObject, currentTime: number): {
    position?: Vec2,
    size?: Vec2,
    rotation?: number
} | undefined {
    const parent = object.parent ? getAbsoluteInViewport(object.parent, currentTime) : null;
    let position = (object.scene.object as ISceneObjectWithPositionalData).isPositional ? {
        x: (object.scene.object as ISceneObjectWithPositionalData).x.get(currentTime),
        y: (object.scene.object as ISceneObjectWithPositionalData).y.get(currentTime)
    } : undefined;
    let size = (object.scene.object as ISceneObjectWithSizeData).isSizable ? {
        x: (object.scene.object as ISceneObjectWithSizeData).width.get(currentTime),
        y: (object.scene.object as ISceneObjectWithSizeData).height.get(currentTime)
    } : undefined;

    if (position && parent?.position) {
        position = { x: position.x + parent.position.x, y: position.y + parent.position.y };
    }

    return { position, size };
}

export function calculateViewportButtonGeometries(
    objectGeom: ReturnType<typeof getAbsoluteInViewport>,
    viewportScale: number = 1
): {
    geometry: { // The geometry of the button - for handling clicks or drawing rectangles
        position: Vec2,
        size: Vec2
    },
    drawMode: "hidden" | "filled" | "border", // Drawing mode
    inputMatrix?: { // If present: Can be dragged
        position: Vec2,
        size: Vec2
    }
}[] | undefined {
    if (!objectGeom) return;
    if (!objectGeom.position) return; // Can't handle object without position at this moment

    if (!objectGeom.size) return [{
        geometry: {
            position: { x: objectGeom.position.x * viewportScale - 5, y: objectGeom.position.y * viewportScale - 5 },
            size: { x: 11, y: 11 }
        },
        drawMode: "filled",
        inputMatrix: {
            position: { x: 1, y: 1 },
            size: { x: 0, y: 0 }
        }
    }];

    return [
        {
            geometry: {
                position: { x: objectGeom.position.x * viewportScale, y: objectGeom.position.y * viewportScale },
                size: { x: objectGeom.size.x * viewportScale, y: objectGeom.size.y * viewportScale }
            },
            drawMode: "hidden",
            inputMatrix: {
                position: { x: 1, y: 1 },
                size: { x: 0, y: 0 }
            }
        },
        {
            geometry: {
                position: { x: objectGeom.position.x * viewportScale - 5, y: objectGeom.position.y * viewportScale - 5 },
                size: { x: objectGeom.size.x * viewportScale + 10, y: objectGeom.size.y * viewportScale + 10 }
            },
            drawMode: "border",
        },
        {
            geometry: {
                position: {
                    x: objectGeom.position.x * viewportScale - 11,
                    y: objectGeom.position.y * viewportScale - 11
                },
                size: { x: 11, y: 11 }
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 1, y: 1 },
                size: { x: -1, y: -1 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x) * viewportScale,
                    y: objectGeom.position.y * viewportScale - 11
                },
                size: { x: 11, y: 11 }
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 1 },
                size: { x: 1, y: -1 }
            }
        },
        {
            geometry: {
                position: {
                    x: objectGeom.position.x * viewportScale - 11,
                    y: (objectGeom.position.y + objectGeom.size.y) * viewportScale
                },
                size: { x: 11, y: 11 }
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 1, y: 0 },
                size: { x: -1, y: 1 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x) * viewportScale,
                    y: (objectGeom.position.y + objectGeom.size.y) * viewportScale
                },
                size: { x: 11, y: 11 }
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 0 },
                size: { x: 1, y: 1 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x / 2) * viewportScale - 11,
                    y: objectGeom.position.y * viewportScale - 11
                },
                size: { x: 22, y: 11 }
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 1 },
                size: { x: 0, y: -1 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x / 2) * viewportScale - 11,
                    y: (objectGeom.position.y + objectGeom.size.y) * viewportScale
                },
                size: { x: 22, y: 11 }
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 0 },
                size: { x: 0, y: 1 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x) * viewportScale - 11,
                    y: (objectGeom.position.y + objectGeom.size.y / 2) * viewportScale - 11
                },
                size: { x: 11, y: 22 }
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 1, y: 0 },
                size: { x: -1, y: 0 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x) * viewportScale,
                    y: (objectGeom.position.y + objectGeom.size.y / 2) * viewportScale - 11
                },
                size: { x: 11, y: 22 }
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 0 },
                size: { x: 1, y: 0 }
            }
        },
    ];
}