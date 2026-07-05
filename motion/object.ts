import type { Environment } from "./environment.ts";
import type { RenderTarget } from "./target.ts";

/**
 * Object type.
 */
export interface ObjectType<S> {
    /**
     * ID for identifying the type of object.
     *
     * The ID typically follows the `[A-Za-z-_]:[A-Za-z0-9-_/]` pattern, with the first part of the ID for namespace and
     * second part for path to object type. For example: `nahara:mesh` and `nahara:mesh/modifiers/line`.
     *
     * It is highly recommended to follow the namespace + path pattern for ID, as the path part will be used as
     * suggestion when inserting the object to the tree. For example, if the mesh modifier is meant to be inserted into
     * mesh's children list, the path part of ID should have `mesh/` prefix.
     */
    readonly typeId: string;

    /**
     * Create a new default object state.
     *
     * In most cases, this method should return the same state every time. In some cases, the method may return
     * different state every time this method is called, usually to create a new `symbol` or a random value.
     */
    createDefault(): S;

    /**
     * Create a new global renderer.
     *
     * The created global renderer is bounds to one specific environment only. The environment provide resources needed
     * for objects to render, such as access to GPU device. The renderers created for a specific environment will only
     * be used for that environment only, which allows the renderers to be used on multiple workers, such as graphics +
     * video workers for example.
     *
     * If the environment is not compatible with the object, the returned value will be `null`. Incompatible environment
     * usually means the object cannot be rendered in that specific environment.
     *
     * @param env Environment the renderer is being created
     */
    createGlobalRenderer(env: Environment): ObjectGlobalRenderer<S> | null | Promise<ObjectGlobalRenderer<S> | null>;
}

/**
 * Object global renderer.
 *
 * An object global renderer is basically a type-level renderer that manage the resources for rendering the objects of
 * same type, such as preparing before any object is rendered, finishing up before the objects are "committed", and free
 * up resources when the global renderer is no longer needed.
 *
 * Global renderer is only invoked when there is at least 1 object that is visible in the scene, which is when the
 * seekhead is pointing on the object's visible range and the object is enabled. Global renderer only be created when
 * there is at least 1 object of specific type in the scene and will be freed up when there is no object of the same
 * type in the scene anymore.
 */
export interface ObjectGlobalRenderer<S> {
    /**
     * Begin rendering of all objects.
     *
     * Called before any object is rendered. The implementation can do preparation in this method, such as recalling
     * buffers from staging belts for example.
     */
    begin?(): void | Promise<void>;

    /**
     * Create a new object-local renderer.
     *
     * The renderer created from this method is bounds to one specific object only.
     */
    createLocalRenderer(): ObjectLocalRenderer<S> | Promise<ObjectLocalRenderer<S>>;

    /**
     * Finishing up rendering of all objects.
     *
     * Called after all objects are rendered and before the render commit. The implementation can do finishing up in
     * this method, such as finishing up staging belts for example.
     */
    end?(): void | Promise<void>;

    /**
     * Clean up resources.
     *
     * Called when the object type is no longer present in the scene.
     */
    destroy?(): void;
}

/**
 * Object renderer.
 */
export interface ObjectLocalRenderer<S> {
    /**
     * Begin rendering the object.
     *
     * Called once in the rendering round before `render()` is called.
     *
     * @param state Snapshot of the object state
     */
    begin?(state: S): void | Promise<void>;

    /**
     * Render the object.
     *
     * This method will only be called when the object is visible, which is when the seekhead is on the time range of
     * object and the object is visible.
     *
     * @param info Render information
     */
    render(info: RenderInfo<S>): void | Promise<void>;

    /**
     * Finishing up rendering of the object.
     *
     * Called once in the rendering round after `render()` is called.
     *
     * @param state Snapshot of the object state
     */
    end?(state: S): void | Promise<void>;

    /**
     * Clean up resources.
     *
     * Called when the object is no longer present in the scene.
     */
    destroy?(): void;
}

/**
 * Render information.
 */
export interface RenderInfo<S> {
    /**
     * Current snapshot of the object state.
     */
    readonly state: S;

    /**
     * Handle of the object.
     *
     * The main purpose of object handle is to check whether the object is being selected in editor. Because the parent
     * objects can modify the render target, the object need to compare the handle provided from editor's target with
     * this value to determine if the object is being selected or interacted.
     */
    readonly handle: unknown;

    /**
     * The target that object will render into.
     *
     * The target is a map of subtargets that the object can render into.
     */
    readonly target: RenderTarget;

    /**
     * Render children.
     *
     * Propagate to children with optional render options. Render options can be used to provide different render target
     * or new variables.
     *
     * @param options Render options
     */
    renderChildren(options?: RenderOptions): Promise<void>;
}

/**
 * Render options.
 */
export interface RenderOptions {
    /**
     * Replace the render target.
     *
     * Children will render into the provided target instead of inheriting the target from parent.
     */
    readonly target?: RenderTarget;
}
