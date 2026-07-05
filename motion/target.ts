import type { Matrix4 } from "./math.ts";

/**
 * Render target.
 *
 * When rendering the objects, the object renderer will render the content to render target. If the render target is
 * incompatible, the renderer simply ignores it.
 */
export abstract class RenderTarget {}

/**
 * Graphics target.
 *
 * The graphics target is provided to all objects connected to scene root or parent with framebuffer inside graphics
 * environment. Objects is then rendered the graphics to the color framebuffer texture.
 */
export abstract class GraphicsTarget extends RenderTarget {
    /**
     * GPU command encoder.
     *
     * Draw commands should be encoded using this encoder, especially when it is about drawing to `color` texture.
     */
    abstract readonly encoder: GPUCommandEncoder;

    /**
     * Scene projection matrix.
     *
     * Multiply this projection matrix with world coordinates to calculate normalized device coordinates for
     * framebuffers.
     */
    abstract readonly projection: Matrix4;

    /**
     * Framebuffer color texture.
     *
     * Graphical objects should be drawing the content to this texture. Unless the object affects the entire window,
     * clear operation should be set to `keep` and store should be `store`.
     */
    abstract readonly color: GPUTexture;
}

/**
 * Selectable target.
 *
 * An object may consists of multiple elements, such as text object. Selectable target allows the children to select a
 * subset of elements on parent and apply modifiers on those elements only, such as selecting a set of characters or
 * words.
 */
export abstract class SelectableTarget extends RenderTarget {
    /**
     * Count the number of elements.
     *
     * @param level Element level
     */
    abstract count(level: number): number;

    /**
     * Select an element at specified level.
     *
     * Rendering to the returned render targets from this method will only affect the element that is selected from this
     * method. For example, if the parent is a text object, element level is `1` (word-level) and element index is `2`,
     * rendering to transformable target returned from this method will transform the 3rd word in parent object.
     *
     * @param level Element level
     * @param index Element index in the level
     */
    abstract select(level: number, index: number): Iterable<RenderTarget>;
}

/**
 * Transformable target.
 *
 * Objects that can be transformed with 4x4 matrix usually provide this target to children. The children would call
 * `transform()` on this target to transform the parent.
 */
export abstract class TransformableTarget extends RenderTarget {
    /**
     * Transform the target.
     *
     * Apply the transformation on the target.
     *
     * @param matrix Transformation matrix to apply
     */
    abstract transform(matrix: Matrix4): void;
}
