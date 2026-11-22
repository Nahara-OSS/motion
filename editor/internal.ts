/**
 * Join and resolve paths to path segments
 *
 * ```
 * assertEquals(
 *     resolvePath("main.bin", "..", "./modules/components.bin"),
 *     ["modules", "components.bin"]
 * );
 * ```
 *
 * Resolve rules:
 *
 * - `.` keep the same path: `"./modules"` become `["modules"]`
 * - `..` pop from path segment stack: `"a/b/../modules"` become `["a", "modules"]`
 * - `/` reset the stack to root: `["modules/main.bin", "..", "/asset.png"]` become `["asset.png"]`
 *
 * @param paths Paths to join
 * @returns Path segments
 */
export function resolvePath(...paths: string[]): string[] {
    let stack: string[] = [];

    for (const str of paths) {
        if (str.trim().startsWith("/")) {
            stack = [];
        }

        for (let segment of str.split("/")) {
            segment = segment.trim();
            if (segment.length == 0) continue;
            if (segment == "." || (segment == ".." && stack.length == 0)) continue;
            if (segment == "..") stack.pop();
            else stack.push(segment);
        }
    }

    return stack;
}
