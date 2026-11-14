/**
 * Align input value to multiples of some alignment value
 *
 * @param x Value to align
 * @param alignment Alignment
 * @returns Aligned value
 */
export function align(x: number, alignment: number): number {
    return Math.floor((x + alignment - 1) / alignment) * alignment;
}
