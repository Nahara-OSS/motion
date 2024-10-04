import { type IObjectContainer, type IScene, type ISceneContainerObject, type SceneObjectInfo } from "@nahara/motion";

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