import { Scene, type IObjectContainer, type IScene, type ISceneContainerObject, type ISceneObjectWithPositionalData, type ISceneObjectWithRotationData, type ISceneObjectWithSizeData, type ISceneObjectWithViewportEditing, type SceneObjectInfo, type Vec2 } from "@nahara/motion";

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
        const geometry = getAbsoluteInViewport0(object, currentTime, 1);
        if (!geometry) continue;

        const point = geometry.transform.inverse().transformPoint({ x, y });
        const pointB = geometry.transform.transformPoint({ x, y });
        let clickedChild = object.children
            ? findObjectFromPoint(x, y, currentTime, object.children, filter, flip)
            : undefined;
        if (clickedChild) return clickedChild;

        if (!geometry.size) continue;
        const clickedInObj = point.x >= 0 && point.y >= 0 && point.x < geometry.size.x && point.y < geometry.size.y;
        if (filter(object) && clickedInObj) return object;
    }
}

export function getAbsoluteInViewport0(object: ViewportSceneObject, currentTime: number, vpScale: number): {
    transform: DOMMatrix,
    viewportScale: number,
    size?: Vec2
} | undefined {
    const parent = object.parent ? getAbsoluteInViewport0(object.parent, currentTime, vpScale) : null;
    let position = (object.scene.object as ISceneObjectWithPositionalData).isPositional ? {
        x: (object.scene.object as ISceneObjectWithPositionalData).x.get(currentTime) * vpScale,
        y: (object.scene.object as ISceneObjectWithPositionalData).y.get(currentTime) * vpScale
    } : undefined;
    let size = (object.scene.object as ISceneObjectWithSizeData).isSizable ? {
        x: (object.scene.object as ISceneObjectWithSizeData).width.get(currentTime) * vpScale,
        y: (object.scene.object as ISceneObjectWithSizeData).height.get(currentTime) * vpScale
    } : undefined;
    let rotation = (object.scene.object as ISceneObjectWithRotationData).isRotatable
        ? (object.scene.object as ISceneObjectWithRotationData).rotation.get(currentTime)
        : undefined;

    let transform = parent?.transform ?? new DOMMatrix();
    if (position) transform = transform.translate(position.x, position.y);
    if (size) transform = transform.translate(size.x / 2, size.y / 2);
    if (rotation != null) transform = transform.rotate(rotation);
    if (size) transform = transform.translate(-size.x / 2, -size.y / 2);
    return { transform, size, viewportScale: vpScale };
}

interface ViewportButtonGeometry {
    position: Vec2;
    size: Vec2;
}

interface ViewportInput {
    position?: Vec2,
    size?: Vec2,
    rotation?: boolean
}

interface ViewportButton {
    geometry: ViewportButtonGeometry;
    drawStyle: "filled" | "outline" | "hidden";
    input?: ViewportInput;
}

export function calculateViewportButtons0(
    object: SceneObjectInfo,
    { transform, viewportScale, size }: ReturnType<typeof getAbsoluteInViewport0> & {}
): ViewportButton[] {
    const out: ViewportButton[] = [];

    if (!size) {
        out.push({
            geometry: {
                position: { x: -10, y: -10 },
                size: { x: 20, y: 20 }
            },
            drawStyle: "filled",
            input: {
                position: { x: 1, y: 1 }
            }
        });
    } else {
        out.push({
            geometry: {
                position: { x: 0, y: 0 },
                size: size
            },
            drawStyle: "outline",
            input: {
                position: { x: 1, y: 1 }
            }
        }, {
            geometry: {
                position: { x: -12, y: -12 },
                size: { x: 12, y: 12 }
            },
            drawStyle: "filled",
            input: {
                position: { x: 1, y: 1 },
                size: { x: -1, y: -1 }
            }
        }, {
            geometry: {
                position: { x: size.x, y: -12 },
                size: { x: 12, y: 12 }
            },
            drawStyle: "filled",
            input: {
                position: { x: 0, y: 1 },
                size: { x: 1, y: -1 }
            }
        }, {
            geometry: {
                position: { x: -12, y: size.y },
                size: { x: 12, y: 12 }
            },
            drawStyle: "filled",
            input: {
                position: { x: 1, y: 0 },
                size: { x: -1, y: 1 }
            }
        }, {
            geometry: {
                position: { x: size.x, y: size.y },
                size: { x: 12, y: 12 }
            },
            drawStyle: "filled",
            input: {
                size: { x: 1, y: 1 }
            }
        },
        {
            geometry: {
                position: { x: size.x / 2 - 12, y: -12 },
                size: { x: 24, y: 12 }
            },
            drawStyle: "filled",
            input: {
                position: { x: 0, y: 1 },
                size: { x: 0, y: -1 }
            }
        },
        {
            geometry: {
                position: { x: size.x / 2 - 12, y: size.y },
                size: { x: 24, y: 12 }
            },
            drawStyle: "filled",
            input: {
                position: { x: 0, y: 0 },
                size: { x: 0, y: 1 }
            }
        },
        {
            geometry: {
                position: { x: -12, y: size.y / 2 - 12 },
                size: { x: 12, y: 24 }
            },
            drawStyle: "filled",
            input: {
                position: { x: 1, y: 0 },
                size: { x: -1, y: 0 }
            }
        },
        {
            geometry: {
                position: { x: size.x, y: size.y / 2 - 12 },
                size: { x: 12, y: 24 }
            },
            drawStyle: "filled",
            input: {
                position: { x: 0, y: 0 },
                size: { x: 1, y: 0 }
            }
        });
    }

    if ((object.object as ISceneObjectWithRotationData).isRotatable) {
        out.push({
            geometry: {
                position: { x: (size?.x ?? 0) / 2 - 5, y: -40 },
                size: { x: 10, y: 10 }
            },
            drawStyle: "filled",
            input: {
                rotation: true
            }
        });
    }

    return out;
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
    let rotation = (object.scene.object as ISceneObjectWithRotationData).isRotatable
        ? (object.scene.object as ISceneObjectWithRotationData).rotation.get(currentTime)
        : undefined;

    if (position && parent?.position) {
        position = { x: position.x + parent.position.x, y: position.y + parent.position.y };
    }

    if (rotation != null && parent?.rotation != null) {
        rotation += parent.rotation;
    }

    return { position, size, rotation };
}

export function calculateViewportButtonGeometries(
    objectGeom: ReturnType<typeof getAbsoluteInViewport>,
    viewportScale: number = 1
): {
    geometry: { // The geometry of the button - for handling clicks or drawing rectangles
        position: Vec2,
        size: Vec2,
        rotation: number
    },
    drawMode: "hidden" | "filled" | "border", // Drawing mode
    inputMatrix?: { // If present: Can be dragged
        position: Vec2,
        size: Vec2,
        rotation: Vec2
    }
}[] | undefined {
    if (!objectGeom) return;
    if (!objectGeom.position) return; // Can't handle object without position at this moment

    if (!objectGeom.size) return [{
        geometry: {
            position: { x: objectGeom.position.x * viewportScale - 5, y: objectGeom.position.y * viewportScale - 5 },
            size: { x: 11, y: 11 },
            rotation: 0
        },
        drawMode: "filled",
        inputMatrix: {
            position: { x: 1, y: 1 },
            size: { x: 0, y: 0 },
            rotation: { x: 0, y: 0 }
        }
    }];

    const out: (ReturnType<typeof calculateViewportButtonGeometries> & {}) = [
        {
            geometry: {
                position: { x: objectGeom.position.x * viewportScale, y: objectGeom.position.y * viewportScale },
                size: { x: objectGeom.size.x * viewportScale, y: objectGeom.size.y * viewportScale },
                rotation: 0
            },
            drawMode: "hidden",
            inputMatrix: {
                position: { x: 1, y: 1 },
                size: { x: 0, y: 0 },
                rotation: { x: 0, y: 0 }
            }
        },
        {
            geometry: {
                position: { x: objectGeom.position.x * viewportScale - 5, y: objectGeom.position.y * viewportScale - 5 },
                size: { x: objectGeom.size.x * viewportScale + 10, y: objectGeom.size.y * viewportScale + 10 },
                rotation: objectGeom.rotation ?? 0
            },
            drawMode: "border",
        },
        {
            geometry: {
                position: {
                    x: objectGeom.position.x * viewportScale - 11,
                    y: objectGeom.position.y * viewportScale - 11
                },
                size: { x: 11, y: 11 },
                rotation: 0
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 1, y: 1 },
                size: { x: -1, y: -1 },
                rotation: { x: 0, y: 0 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x) * viewportScale,
                    y: objectGeom.position.y * viewportScale - 11
                },
                size: { x: 11, y: 11 },
                rotation: 0
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 1 },
                size: { x: 1, y: -1 },
                rotation: { x: 0, y: 0 }
            }
        },
        {
            geometry: {
                position: {
                    x: objectGeom.position.x * viewportScale - 11,
                    y: (objectGeom.position.y + objectGeom.size.y) * viewportScale
                },
                size: { x: 11, y: 11 },
                rotation: 0
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 1, y: 0 },
                size: { x: -1, y: 1 },
                rotation: { x: 0, y: 0 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x) * viewportScale,
                    y: (objectGeom.position.y + objectGeom.size.y) * viewportScale
                },
                size: { x: 11, y: 11 },
                rotation: 0
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 0 },
                size: { x: 1, y: 1 },
                rotation: { x: 0, y: 0 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x / 2) * viewportScale - 11,
                    y: objectGeom.position.y * viewportScale - 11
                },
                size: { x: 22, y: 11 },
                rotation: 0
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 1 },
                size: { x: 0, y: -1 },
                rotation: { x: 0, y: 0 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x / 2) * viewportScale - 11,
                    y: (objectGeom.position.y + objectGeom.size.y) * viewportScale
                },
                size: { x: 22, y: 11 },
                rotation: 0
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 0 },
                size: { x: 0, y: 1 },
                rotation: { x: 0, y: 0 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x) * viewportScale - 11,
                    y: (objectGeom.position.y + objectGeom.size.y / 2) * viewportScale - 11
                },
                size: { x: 11, y: 22 },
                rotation: 0
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 1, y: 0 },
                size: { x: -1, y: 0 },
                rotation: { x: 0, y: 0 }
            }
        },
        {
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x) * viewportScale,
                    y: (objectGeom.position.y + objectGeom.size.y / 2) * viewportScale - 11
                },
                size: { x: 11, y: 22 },
                rotation: 0
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 0 },
                size: { x: 1, y: 0 },
                rotation: { x: 0, y: 0 }
            }
        },
    ];

    if (objectGeom.rotation != null) {
        out.push({
            geometry: {
                position: {
                    x: (objectGeom.position.x + objectGeom.size.x / 2) * viewportScale - 5,
                    y: objectGeom.position.y * viewportScale - 40
                },
                size: { x: 11, y: 11 },
                rotation: 0
            },
            drawMode: "filled",
            inputMatrix: {
                position: { x: 0, y: 0 },
                size: { x: 0, y: 0 },
                rotation: { x: 1, y: 0 } // TODO
            }
        });
    }

    return out;
}