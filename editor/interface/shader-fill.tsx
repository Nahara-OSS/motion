import type { ComponentType } from "preact";
import { useRef } from "preact/hooks";

/**
 * Fill using shader
 *
 * **Using shader**: The WGSL providing to this component props should only contain a single fragment shader. Vertex
 * shaders will be ignored. The only input mapped to location 0 is the normalized coordinates of the fragment, with
 * `vec2f(0.0, 0.0)` being bottom-left and  `vec2f(1.0, 1.0)` being top-right corners of the canvas. The fragment shader
 * is expected to only return a single `vec4f` target for location 0.
 *
 * **Using uniform**: If the uniform size is larger than 0, `onUniform` will be called with `ArrayBuffer` to fill in
 * uniform data. Uniform is always attached to binding 0 of bind group 0.
 */
export const ShaderFill: ComponentType<{
    class?: string;
    wgsl: string;
    uniformSize?: number;
    onUniform?: (data: ArrayBuffer) => void;
}> = ({
    class: cls,
    wgsl,
    uniformSize = 0,
    onUniform = () => {},
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    return <canvas class={cls} ref={canvasRef} />;
};
