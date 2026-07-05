/**
 * Resources system in Nahara's Motion.
 *
 * Resources are typically tied to project. Even though the concept of project is only available to Nahara's Motion
 * editor, the engine still need a way to obtain resources. This module only provide read-only access to resource
 * system.
 *
 * @module
 */

export interface ResourceIdentifier {
    /**
     * The source of resource.
     *
     * A resource can be obtained from various places, like project's folder or plugin's resource provider for example.
     * Think of this field as "namespace" or "URL scheme" for resources.
     */
    readonly source: string;

    /**
     * Path to resource.
     */
    readonly path: string;
}

export interface ResourceProvider {
    /**
     * Try to get resource from provider
     *
     * The method will return `null` if there is no such resource for given identifier.
     *
     * @param id Resource identifier
     */
    get(id: ResourceIdentifier): Promise<Blob | null>;
}

export function compareIdentifier(a: ResourceIdentifier, b: ResourceIdentifier): boolean {
    return a.source == b.source && a.path == b.path;
}
