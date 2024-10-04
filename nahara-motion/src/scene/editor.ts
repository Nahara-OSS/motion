import { RenderContext } from "../render/context.js";
import { Vec2 } from "../types.js";
import { ISceneObject } from "./object.js";

/**
 * Any scene object that implements this interface will have viewport editing feature (such as resizing or moving the
 * object right in viewport). Objects that do not implement this will not be editable in viewport.
 */
export interface ISceneObjectWithViewportEditSupport<TEditorEventData> extends ISceneObject {
    readonly isViewportEditable: true;

    /**
     * Render the blueprint of this scene object. Blueprint view can be known as "wireframe view", which shows all
     * objects at current time as outlines, along with some properties. The following properties should be rendered in
     * blueprint view:
     *
     * - Width and height: Render as thin outline rectangle.
     * - Anchor of the object: Render as X mark.
     * - Offset: Render as arrow pointing from anchor towards the origin.
     * - Origin of the object (with offset applied): Render as small circle.
     *
     * @param context The rendering context.
     * @param objectColor The user-defined color for this object, which is also visible on timeline and outliner panes.
     * @param viewportScale The scale of viewport.
     */
    renderBlueprint(context: RenderContext, objectColor: string, viewportScale: number): void;

    getViewportEditorInfo(time: number, parentSize: Vec2): ViewportEditorInfo;

    viewportEditMouseDown?(event: ViewportEditMouseEvent): TEditorEventData;
    viewportEditMouseMove?(event: ViewportEditMouseEvent, data: TEditorEventData): void;
    viewportEditMouseUp?(event: ViewportEditMouseEvent, data: TEditorEventData): void;
}

export interface ViewportEditorInfo {
    parentToThis: DOMMatrix;
    clickableSize: Vec2;
    handles: ViewportEditHandle[];
}

/**
 * The viewport edit handle, which user can drag and drop to change the object properties. The offset is the handle's
 * position relative to object's top-left corner.
 */
export interface ViewportEditHandle {
    uid: any;
    offsetX: number;
    offsetY: number;
    hint:
        | "regular"
        | "resize-top-left" | "resize-top-right" | "resize-bottom-left" | "resize-bottom-right"
        | "resize-top" | "resize-bottom" | "resize-left" | "resize-right"
        | "rotate";
}

/**
 * The coordinates of the mouse.
 *
 * - Scene coordinates: The coordinates in scene space. Eg: if the scene size is 1920x1080, the XY position can only be
 * within 1920x1080 area.
 * - Local object coordinates: The coordinates in local object space. For example, if user is clicking on the top-left
 * position of the object's boundary box, it will be `(0; 0)`.
 */
export interface ViewportEditMouseEvent {
    time: number;
    sceneX: number;
    sceneY: number;
    localObjectX: number;
    localObjectY: number;
    parentObjectLocalX: number;
    parentObjectLocalY: number;
    clickedHandle?: ViewportEditHandle;
}