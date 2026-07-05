import type { ResourceProvider } from "./resource.ts";

/**
 * Render environment.
 */
export abstract class Environment {}

/**
 * Graphics render environment.
 */
export class GraphicsEnvironment extends Environment {
    constructor(
        public readonly gpu: GPUDevice,
        public readonly resource: ResourceProvider,
    ) {
        super();
    }
}
